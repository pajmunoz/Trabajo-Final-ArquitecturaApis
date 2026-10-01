import { DomainError } from './errors.js';
import { calculoInteresPara } from './estrategias/calculo-interes.strategy.js';
import { mesesEntre } from './fechas.js';
import { PLAZO_MAXIMO_MESES, PLAZO_MINIMO_MESES, type Tasas } from './tarifas.js';

export interface PuntoProyeccion {
  mes: number;
  aportadoCentavos: number;
  interesesCentavos: number;
  saldoCentavos: number;
}

export interface Simulacion {
  moneda: 'USD';
  montoMetaCentavos: number;
  fechaObjetivo: string;
  plazoMeses: number;
  bloqueado: boolean;
  tasas: Tasas;
  cuotaMensualCentavos: number;
  totalAportadoCentavos: number;
  interesesProyectadosCentavos: number;
  montoFinalCentavos: number;
  proyeccion: PuntoProyeccion[];
}

/** Cuota fija mensual (aporte al final de cada mes) que alcanza la meta. */
export function calcularCuota(montoMetaCentavos: number, plazoMeses: number, tnaPorcentaje: number): number {
  const r = tnaPorcentaje / 1200;
  const factor = r === 0 ? plazoMeses : ((1 + r) ** plazoMeses - 1) / r;
  return Math.ceil(montoMetaCentavos / factor);
}

export function plazoDesdeFecha(hoy: string, fechaObjetivo: string): number {
  const plazo = mesesEntre(hoy, fechaObjetivo);
  if (plazo < PLAZO_MINIMO_MESES || plazo > PLAZO_MAXIMO_MESES) {
    throw new DomainError('VALIDACION', 'La fecha objetivo debe estar entre 1 y 120 meses desde hoy.', [
      { campo: 'fechaObjetivo', mensaje: 'debe estar entre 1 y 120 meses desde hoy' },
    ]);
  }
  return plazo;
}

/** Misma lógica para GET /v1/simulaciones y para crear un plan. */
export function simular(montoMetaCentavos: number, fechaObjetivo: string, bloqueado: boolean, hoy: string): Simulacion {
  if (!Number.isInteger(montoMetaCentavos) || montoMetaCentavos < 1) {
    throw new DomainError('VALIDACION', 'El monto meta debe ser al menos 1 centavo.', [
      { campo: 'montoMetaCentavos', mensaje: 'debe ser un entero mayor o igual a 1' },
    ]);
  }
  const plazoMeses = plazoDesdeFecha(hoy, fechaObjetivo);
  const estrategia = calculoInteresPara(bloqueado);
  const tasas = estrategia.tasas(plazoMeses);
  const cuota = calcularCuota(montoMetaCentavos, plazoMeses, tasas.totalAnual);

  const proyeccion: PuntoProyeccion[] = [];
  let saldo = 0;
  let intereses = 0;
  for (let mes = 1; mes <= plazoMeses; mes++) {
    const interes = estrategia.interesMensual(saldo, tasas);
    intereses += interes;
    saldo += interes + cuota;
    proyeccion.push({ mes, aportadoCentavos: cuota * mes, interesesCentavos: intereses, saldoCentavos: saldo });
  }

  return {
    moneda: 'USD',
    montoMetaCentavos,
    fechaObjetivo,
    plazoMeses,
    bloqueado,
    tasas,
    cuotaMensualCentavos: cuota,
    totalAportadoCentavos: cuota * plazoMeses,
    interesesProyectadosCentavos: intereses,
    montoFinalCentavos: saldo,
    proyeccion,
  };
}
