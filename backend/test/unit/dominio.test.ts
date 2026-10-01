import { describe, expect, it } from 'vitest';
import { estadoCuotaDe, MAX_INTENTOS, type Cuota } from '../../src/domain/cuota/cuota.js';
import { DomainError } from '../../src/domain/errors.js';
import { calculoInteresPara, TasaBaseStrategy, TasaConBonoStrategy } from '../../src/domain/estrategias/calculo-interes.strategy.js';
import { politicaSalidaPara } from '../../src/domain/estrategias/salida-bloqueo.strategy.js';
import { fechaDe, mesesEntre, proximaFechaConDia, sumarMeses } from '../../src/domain/fechas.js';
import { esDebito, etiquetaCuenta } from '../../src/domain/operaciones.js';
import { estadoDe } from '../../src/domain/plan/estados-plan.js';
import { progreso, saldoDisponible } from '../../src/domain/plan/plan-ahorro.js';
import { calcularCuota, simular } from '../../src/domain/simulacion.js';
import { componerTasas, tasaEfectiva, tramoPara } from '../../src/domain/tarifas.js';
import { planDePrueba } from '../fakes/fabricas.js';

const codigoDe = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as DomainError).codigo;
  }
  return undefined;
};

describe('fechas', () => {
  it('suma meses conservando el día y ajusta al último día del mes', () => {
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(sumarMeses('2026-11-15', 2)).toBe('2027-01-15');
    expect(sumarMeses('2026-03-15', -3)).toBe('2025-12-15');
  });

  it('cuenta meses completos', () => {
    expect(mesesEntre('2026-10-01', '2027-10-01')).toBe(12);
    expect(mesesEntre('2026-10-15', '2026-11-14')).toBe(0);
    expect(mesesEntre('2027-01-01', '2026-01-01')).toBe(0);
  });

  it('calcula la próxima fecha con un día dado, siempre posterior', () => {
    expect(proximaFechaConDia('2026-10-01', 15)).toBe('2026-10-15');
    expect(proximaFechaConDia('2026-10-15', 15)).toBe('2026-11-15');
    expect(proximaFechaConDia('2026-10-20', 5)).toBe('2026-11-05');
    expect(fechaDe(new Date('2026-10-01T23:59:00Z'))).toBe('2026-10-01');
  });
});

describe('tarifas', () => {
  it('elige el tramo por plazo y usa el último si no hay tope', () => {
    expect(tramoPara(6).tasaBaseAnual).toBe(4.0);
    expect(tramoPara(12).tasaBaseAnual).toBe(4.5);
    expect(tramoPara(200).tasaBaseAnual).toBe(5.0);
    expect(tramoPara(5, { moneda: 'USD', vigenteDesde: '2026-01-01', tramos: [{ plazoMinimoMeses: 12, plazoMaximoMeses: 24, tasaBaseAnual: 3, bonoBloqueoAnual: 1 }] }).tasaBaseAnual).toBe(3);
  });

  it('calcula la TEA con capitalización mensual', () => {
    expect(tasaEfectiva(5.6)).toBe(5.75);
    expect(componerTasas(4.5, 1.1)).toEqual({ baseAnual: 4.5, bonoBloqueoAnual: 1.1, totalAnual: 5.6, efectivaAnual: 5.75 });
  });
});

describe('simulación (mismo ejemplo que el contrato)', () => {
  it('meta de USD 1.200 a 12 meses bloqueado: cuota 97,46', () => {
    const s = simular(120_000, '2027-10-01', true, '2026-10-01');
    expect(s.plazoMeses).toBe(12);
    expect(s.cuotaMensualCentavos).toBe(9746);
    expect(s.totalAportadoCentavos).toBe(116_952);
    expect(s.interesesProyectadosCentavos).toBe(3048);
    expect(s.montoFinalCentavos).toBe(120_000);
    expect(s.proyeccion).toHaveLength(12);
    expect(s.proyeccion[1]).toEqual({ mes: 2, aportadoCentavos: 19_492, interesesCentavos: 45, saldoCentavos: 19_537 });
  });

  it('rechaza montos y fechas fuera de rango', () => {
    expect(codigoDe(() => simular(0, '2027-10-01', false, '2026-10-01'))).toBe('VALIDACION');
    expect(codigoDe(() => simular(100, '2026-10-20', false, '2026-10-01'))).toBe('VALIDACION');
    expect(codigoDe(() => simular(100, '2040-10-01', false, '2026-10-01'))).toBe('VALIDACION');
  });

  it('con tasa 0 reparte la meta en partes iguales', () => {
    expect(calcularCuota(1200, 12, 0)).toBe(100);
  });
});

describe('Strategy: cálculo de interés', () => {
  it('sin bloqueo usa la tasa base; con bloqueo suma el bono del tramo', () => {
    expect(calculoInteresPara(false)).toBeInstanceOf(TasaBaseStrategy);
    expect(calculoInteresPara(true)).toBeInstanceOf(TasaConBonoStrategy);
    expect(calculoInteresPara(false).tasas(12).totalAnual).toBe(4.5);
    expect(calculoInteresPara(true).tasas(12).totalAnual).toBe(5.6);
  });

  it('respeta la tasa base congelada del plan', () => {
    expect(calculoInteresPara(true).tasas(30, 4.0)).toMatchObject({ baseAnual: 4.0, bonoBloqueoAnual: 1.25, totalAnual: 5.25 });
    expect(calculoInteresPara(false).tasas(30, 4.0).totalAnual).toBe(4.0);
  });

  it('el interés mensual se redondea al centavo', () => {
    expect(new TasaBaseStrategy().interesMensual(100_000, componerTasas(6, 0))).toBe(500);
  });
});

describe('Strategy: salida del bloqueo', () => {
  it('solo un plan bloqueado pierde los intereses devengados', () => {
    expect(politicaSalidaPara(false).interesesPerdidos(500)).toBe(0);
    expect(politicaSalidaPara(true).interesesPerdidos(500)).toBe(500);
    expect(politicaSalidaPara(true).interesesPerdidos(-10)).toBe(0);
  });
});

describe('State: ciclo de vida del plan', () => {
  it('ACTIVO permite operar y valida el sub-estado de bloqueo', () => {
    const activo = estadoDe(planDePrueba());
    expect(() => activo.validarAporte(planDePrueba())).not.toThrow();
    expect(() => activo.validarModificacion(planDePrueba())).not.toThrow();
    expect(() => activo.validarCancelacion(planDePrueba())).not.toThrow();
    expect(codigoDe(() => activo.validarDesbloqueo(planDePrueba()))).toBe('PLAN_NO_BLOQUEADO');
    expect(codigoDe(() => activo.validarBloqueo(planDePrueba({ bloqueado: true })))).toBe('PLAN_YA_BLOQUEADO');
    expect(() => activo.validarBloqueo(planDePrueba())).not.toThrow();
    expect(() => activo.validarDesbloqueo(planDePrueba({ bloqueado: true }))).not.toThrow();
  });

  it('un plan bloqueado no admite retiros y el monto no puede superar el disponible', () => {
    const plan = planDePrueba({ saldoCentavos: 10_000, reservadoCentavos: 3_000 });
    expect(codigoDe(() => estadoDe(plan).validarRetiro({ ...plan, bloqueado: true }, 100))).toBe('RETIRO_NO_PERMITIDO');
    expect(codigoDe(() => estadoDe(plan).validarRetiro(plan, 7_001))).toBe('SALDO_INSUFICIENTE');
    expect(() => estadoDe(plan).validarRetiro(plan, 7_000)).not.toThrow();
  });

  it('se completa cuando el saldo alcanza la meta', () => {
    expect(estadoDe(planDePrueba()).debeCompletarse(planDePrueba({ saldoCentavos: 100_000 }))).toBe(true);
    expect(estadoDe(planDePrueba()).debeCompletarse(planDePrueba({ saldoCentavos: 99_999 }))).toBe(false);
  });

  it.each(['COMPLETADO', 'CANCELADO'] as const)('%s es final: todo lanza ESTADO_INVALIDO', (estado) => {
    const plan = planDePrueba({ estado });
    const s = estadoDe(plan);
    expect(s.nombre).toBe(estado);
    for (const accion of [
      () => s.validarModificacion(plan),
      () => s.validarAporte(plan),
      () => s.validarRetiro(plan, 1),
      () => s.validarBloqueo(plan),
      () => s.validarDesbloqueo(plan),
      () => s.validarCancelacion(plan),
    ]) {
      expect(codigoDe(accion)).toBe('ESTADO_INVALIDO');
    }
    expect(s.debeCompletarse(plan)).toBe(false);
  });

  it('progreso y saldo disponible', () => {
    expect(progreso({ saldoCentavos: 29_374, montoMetaCentavos: 120_000 })).toBe(24.48);
    expect(progreso({ saldoCentavos: 500, montoMetaCentavos: 0 })).toBe(0);
    expect(progreso({ saldoCentavos: 200, montoMetaCentavos: 100 })).toBe(100);
    expect(saldoDisponible({ saldoCentavos: 100, reservadoCentavos: 300 })).toBe(0);
  });
});

describe('State: cobro de una cuota (5 intentos a 24 h)', () => {
  const ahora = new Date('2026-10-15T06:00:00.000Z');
  const cuota: Cuota = { id: 'q1', planId: 'p1', numero: 1, fechaProgramada: '2026-10-15', montoCentavos: 100, estado: 'PROGRAMADA', intentos: 0, proximoIntento: null, ejecutadaEn: null };

  it('PROGRAMADA → PENDIENTE → EJECUTADA', () => {
    const pendiente = estadoCuotaDe(cuota).iniciarCobro(cuota);
    expect(pendiente.estado).toBe('PENDIENTE');
    const ejecutada = estadoCuotaDe(pendiente).registrarExito(pendiente, ahora);
    expect(ejecutada).toMatchObject({ estado: 'EJECUTADA', intentos: 1, ejecutadaEn: ahora.toISOString() });
  });

  it('un rechazo reprograma a las 24 h y el quinto cancela la cuota', () => {
    let actual = estadoCuotaDe(cuota).iniciarCobro(cuota);
    for (let i = 1; i < MAX_INTENTOS; i++) {
      const r = estadoCuotaDe(actual).registrarRechazo(actual, ahora);
      expect(r.cancelada).toBe(false);
      expect(r.cuota.proximoIntento).toBe('2026-10-16T06:00:00.000Z');
      actual = estadoCuotaDe(r.cuota).iniciarCobro(r.cuota);
    }
    const ultimo = estadoCuotaDe(actual).registrarRechazo(actual, ahora);
    expect(ultimo).toMatchObject({ cancelada: true, cuota: { estado: 'CANCELADA', intentos: 5 } });
  });

  it('un fallo técnico reprograma sin consumir intentos', () => {
    const pendiente = { ...cuota, estado: 'PENDIENTE' as const, intentos: 2 };
    expect(estadoCuotaDe(pendiente).registrarFalloTecnico(pendiente, ahora)).toMatchObject({ intentos: 2, proximoIntento: '2026-10-16T06:00:00.000Z' });
  });

  it('transiciones inválidas', () => {
    expect(codigoDe(() => estadoCuotaDe(cuota).registrarExito(cuota, ahora))).toBe('ESTADO_INVALIDO');
    expect(codigoDe(() => estadoCuotaDe(cuota).registrarRechazo(cuota, ahora))).toBe('ESTADO_INVALIDO');
    expect(codigoDe(() => estadoCuotaDe(cuota).registrarFalloTecnico(cuota, ahora))).toBe('ESTADO_INVALIDO');
    for (const estado of ['EJECUTADA', 'CANCELADA'] as const) {
      expect(codigoDe(() => estadoCuotaDe({ estado }).iniciarCobro({ ...cuota, estado }))).toBe('ESTADO_INVALIDO');
    }
  });
});

describe('operaciones', () => {
  it('clasifica débitos y arma la etiqueta de la cuenta', () => {
    expect(esDebito('APORTE')).toBe(true);
    expect(esDebito('CUOTA')).toBe(true);
    expect(esDebito('RETIRO')).toBe(false);
    expect(etiquetaCuenta({ tipo: 'AHORROS', numeroEnmascarado: '******8901' })).toBe('Cuenta de Ahorros •• 8901');
    expect(etiquetaCuenta({ tipo: 'CORRIENTE', numeroEnmascarado: '******5432' })).toBe('Cuenta Corriente •• 5432');
  });
});
