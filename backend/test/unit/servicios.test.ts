import { describe, expect, it } from 'vitest';
import { CoreNoDisponibleError, type CoreBancarioPort } from '../../src/application/ports/core-bancario.port.js';
import type { ResultadoCore } from '../../src/domain/eventos.js';
import { DomainError } from '../../src/domain/errors.js';
import { CLIENTE, CUENTA, CUENTA_POBRE, crearEntorno, OPERADOR, OTRO_CLIENTE, PLAN_BASE } from '../fakes/entorno.js';

async function codigo(promesa: Promise<unknown>) {
  try {
    await promesa;
  } catch (error) {
    if (error instanceof DomainError) return error.codigo;
    throw error;
  }
  return 'SIN_ERROR';
}

describe('PlanesService', () => {
  it('crea el plan con cuota calculada, calendario y evento PlanCreado en la outbox', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, { ...PLAN_BASE, bloqueado: true });
    expect(plan).toMatchObject({ estado: 'ACTIVO', plazoMeses: 12, cuotaMensualCentavos: 9746, bloqueado: true, saldoCentavos: 0 });
    expect(plan.tasas.totalAnual).toBe(5.6);
    expect(plan.cuentaDebito).not.toHaveProperty('saldoDisponibleCentavos');
    const cuotas = e.base.cuotas.filter((c) => c.planId === plan.id);
    expect(cuotas).toHaveLength(12);
    expect(cuotas[0]?.fechaProgramada).toBe('2026-10-15');
    expect(plan.fechaFinEstimada).toBe('2027-09-15');
    expect(e.base.outbox.map((x) => x.tipo)).toEqual(['PlanCreado']);
  });

  it('rechaza una cuenta que no es del cliente y traduce la caída del Core a 503', async () => {
    const e = crearEntorno();
    expect(await codigo(e.planes.crear(CLIENTE, { ...PLAN_BASE, cuentaDebitoId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }))).toBe('VALIDACION');
    expect(await codigo(e.planes.crear(OTRO_CLIENTE, PLAN_BASE))).toBe('VALIDACION');
    const caido = crearEntorno({ obtenerCuenta: () => Promise.reject(new CoreNoDisponibleError()) } as unknown as CoreBancarioPort);
    expect(await codigo(caido.planes.crear(CLIENTE, PLAN_BASE))).toBe('CORE_NO_DISPONIBLE');
  });

  it('lista con resumen; un cliente no puede filtrar por clienteId y solo ve lo suyo', async () => {
    const e = crearEntorno();
    await e.planes.crear(CLIENTE, PLAN_BASE);
    await e.planes.crear(CLIENTE, { ...PLAN_BASE, nombre: 'Viaje', montoMetaCentavos: 50_000 });
    const pagina = await e.planes.listar(CLIENTE, { orden: 'montoMetaCentavos', pagina: 1, limite: 1 });
    expect(pagina).toMatchObject({ totalElementos: 2, totalPaginas: 2, pagina: 1 });
    expect(pagina.items[0]?.nombre).toBe('Viaje');
    expect(pagina.resumen).toMatchObject({ totalMetaCentavos: 170_000, cantidadPlanes: 2, planesActivos: 2 });
    expect((await e.planes.listar(OTRO_CLIENTE, { orden: '-creadoEn', pagina: 1, limite: 10 })).totalElementos).toBe(0);
    expect(await codigo(e.planes.listar(CLIENTE, { clienteId: OTRO_CLIENTE.usuarioId, orden: '-creadoEn', pagina: 1, limite: 10 }))).toBe('PERMISO_INSUFICIENTE');
    expect((await e.planes.listar(OPERADOR, { clienteId: CLIENTE.usuarioId, orden: '-creadoEn', pagina: 1, limite: 10 })).totalElementos).toBe(2);
  });

  it('ABAC: un plan ajeno responde NO_ENCONTRADO', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    expect(await codigo(e.planes.obtener(OTRO_CLIENTE, plan.id))).toBe('NO_ENCONTRADO');
    expect((await e.planes.obtener(OPERADOR, plan.id)).id).toBe(plan.id);
  });

  it('modifica datos y reprograma las cuotas al cambiar el día; valida la versión', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    const actualizado = await e.planes.modificar(CLIENTE, plan.id, { diaDebito: 5, nombre: 'Moto nueva', icono: 'home', objetivo: 'x' }, plan.version);
    expect(actualizado).toMatchObject({ diaDebito: 5, nombre: 'Moto nueva', icono: 'home', objetivo: 'x', version: 2, fechaFinEstimada: '2027-09-05' });
    expect(e.base.cuotas.find((c) => c.numero === 1)?.fechaProgramada).toBe('2026-10-05');
    expect(await codigo(e.planes.modificar(CLIENTE, plan.id, { nombre: 'y' }, 1))).toBe('VERSION_DESACTUALIZADA');
  });

  it('bloquea con bono; desbloquear pierde los intereses devengados (PENALIDAD en el ledger)', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    const bloqueado = await e.planes.bloquear(CLIENTE, plan.id);
    expect(bloqueado.tasas).toMatchObject({ baseAnual: 4.5, bonoBloqueoAnual: 1.1, totalAnual: 5.6 });
    expect(await codigo(e.planes.bloquear(CLIENTE, plan.id))).toBe('PLAN_YA_BLOQUEADO');

    await e.uow.repos.movimientos.asentar({ id: 'i1', planId: plan.id, tipo: 'INTERES', montoCentavos: 250, moneda: 'USD', fecha: '2026-10-02T00:00:00Z', descripcion: 'i', origen: 'r', referencia: null, correlationId: null });
    const { plan: libre, interesesPerdidosCentavos } = await e.planes.desbloquear(CLIENTE, plan.id);
    expect(interesesPerdidosCentavos).toBe(250);
    expect(libre).toMatchObject({ bloqueado: false, saldoCentavos: 0, interesesDevengadosCentavos: 0 });
    expect(libre.tasas.totalAnual).toBe(4.5);
    expect(await codigo(e.planes.desbloquear(CLIENTE, plan.id))).toBe('PLAN_NO_BLOQUEADO');
  });

  it('cancela: cancela cuotas, solicita la devolución y publica PlanCancelado', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    await e.dinero.solicitarAporte(CLIENTE, plan.id, 30_000);
    await e.procesarOutbox();
    const resultado = await e.planes.cancelar(CLIENTE, plan.id, CUENTA_POBRE);
    expect(resultado).toMatchObject({ montoDevueltoCentavos: 30_000, estadoDevolucion: 'PENDIENTE', interesesPerdidosCentavos: 0 });
    expect(resultado.plan.estado).toBe('CANCELADO');
    expect(e.base.cuotas.every((c) => c.estado === 'CANCELADA')).toBe(true);
    expect(e.base.outbox.map((x) => x.tipo)).toEqual(expect.arrayContaining(['CreditoSolicitado', 'PlanCancelado']));
    await e.procesarOutbox();
    expect(e.coreSimulado.saldoDe(CUENTA_POBRE)).toBe(30_100);
    expect((await e.planes.obtener(CLIENTE, plan.id)).saldoCentavos).toBe(0);
    expect(await codigo(e.planes.cancelar(CLIENTE, plan.id))).toBe('ESTADO_INVALIDO');
  });

  it('cancelar un plan sin saldo no solicita devolución', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    expect((await e.planes.cancelar(CLIENTE, plan.id)).estadoDevolucion).toBe('EJECUTADO');
  });
});

describe('MovimientosDineroService + resultados del Core', () => {
  it('aporte: queda PENDIENTE, el Core debita y el resultado se asienta en el ledger', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    const aporte = await e.dinero.solicitarAporte(CLIENTE, plan.id, 5_000);
    expect(aporte).toMatchObject({ estado: 'PENDIENTE', tipo: 'APORTE', cuenta: { id: CUENTA } });
    const [resultado] = await e.procesarOutbox();
    expect(resultado?.tipo).toBe('DebitoEjecutado');
    expect((await e.dinero.obtenerAporte(CLIENTE, plan.id, aporte.id)).estado).toBe('EJECUTADO');
    expect(e.coreSimulado.saldoDe(CUENTA)).toBe(995_000);
    const movimientos = await e.consultas.movimientos(CLIENTE, plan.id, { limite: 10 });
    expect(movimientos.items[0]).toMatchObject({ tipo: 'APORTE_MANUAL', montoCentavos: 5_000, saldoResultanteCentavos: 5_000 });
  });

  it('aporte rechazado por fondos insuficientes queda FALLIDO y no toca el saldo', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    const aporte = await e.dinero.solicitarAporte(CLIENTE, plan.id, 5_000, CUENTA_POBRE);
    const [resultado] = await e.procesarOutbox();
    expect(resultado).toMatchObject({ tipo: 'DebitoFallido', datos: { causa: 'NEGOCIO', motivo: 'FONDOS_INSUFICIENTES' } });
    expect(await e.dinero.obtenerAporte(CLIENTE, plan.id, aporte.id)).toMatchObject({ estado: 'FALLIDO', motivoFallo: 'FONDOS_INSUFICIENTES' });
    expect((await e.planes.obtener(CLIENTE, plan.id)).saldoCentavos).toBe(0);
  });

  it('retiro: reserva el monto, valida bloqueo y saldo, y se asienta al confirmarse', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    await e.dinero.solicitarAporte(CLIENTE, plan.id, 10_000);
    await e.procesarOutbox();
    const retiro = await e.dinero.solicitarRetiro(CLIENTE, plan.id, 4_000);
    expect((await e.planes.obtener(CLIENTE, plan.id)).reservadoCentavos).toBe(4_000);
    expect(await codigo(e.dinero.solicitarRetiro(CLIENTE, plan.id, 6_001))).toBe('SALDO_INSUFICIENTE');
    await e.procesarOutbox();
    expect((await e.dinero.obtenerRetiro(CLIENTE, plan.id, retiro.id)).estado).toBe('EJECUTADO');
    expect(await e.planes.obtener(CLIENTE, plan.id)).toMatchObject({ saldoCentavos: 6_000, reservadoCentavos: 0 });
    await e.planes.bloquear(CLIENTE, plan.id);
    expect(await codigo(e.dinero.solicitarRetiro(CLIENTE, plan.id, 100))).toBe('RETIRO_NO_PERMITIDO');
    expect(await codigo(e.dinero.obtenerRetiro(CLIENTE, plan.id, 'no-existe'))).toBe('NO_ENCONTRADO');
    expect(await codigo(e.dinero.obtenerAporte(CLIENTE, plan.id, retiro.id))).toBe('NO_ENCONTRADO');
  });

  it('al alcanzar la meta el plan se completa y se liquidan los fondos', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, { ...PLAN_BASE, montoMetaCentavos: 10_000 });
    await e.dinero.solicitarAporte(CLIENTE, plan.id, 10_000);
    await e.procesarOutbox();
    expect((await e.planes.obtener(CLIENTE, plan.id)).estado).toBe('COMPLETADO');
    expect(e.base.operaciones.some((o) => o.tipo === 'DEVOLUCION')).toBe(true);
    await e.procesarOutbox();
    expect(e.coreSimulado.saldoDe(CUENTA)).toBe(1_000_000);
  });

  it('un débito confirmado después de cancelar se devuelve a la cuenta', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    await e.dinero.solicitarAporte(CLIENTE, plan.id, 2_000);
    const solicitudes = e.base.outbox.filter((x) => x.tipo === 'DebitoSolicitado');
    await e.planes.cancelar(CLIENTE, plan.id);
    e.base.outbox = solicitudes;
    await e.procesarOutbox();
    expect(e.base.operaciones.filter((o) => o.tipo === 'DEVOLUCION')).toHaveLength(1);
  });

  it('descarta eventos duplicados (consumidor idempotente) y resultados de operaciones inexistentes', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    await e.dinero.solicitarAporte(CLIENTE, plan.id, 1_000);
    const [resultado] = await e.procesarOutbox();
    await e.resultados.procesar(resultado as ResultadoCore);
    expect(e.base.movimientos).toHaveLength(1);
    await e.resultados.procesar({ ...(resultado as ResultadoCore), id: 'otro', datos: { ...(resultado as ResultadoCore).datos, operacionId: 'nada' } });
    expect(e.base.movimientos).toHaveLength(1);
  });
});

describe('Batch: corte diario y reintentos de negocio', () => {
  it('cobra la cuota, devenga el interés del mes y cuenta la corrida', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    await e.dinero.solicitarAporte(CLIENTE, plan.id, 100_00);
    await e.procesarOutbox();
    const corrida = await e.corte.ejecutar('2026-10-15');
    expect(corrida).toMatchObject({ estado: 'COMPLETADA', totalCuotas: 1 });
    await e.procesarOutbox();
    const movimientos = (await e.consultas.movimientos(CLIENTE, plan.id, { limite: 10 })).items.map((m) => [m.tipo, m.montoCentavos]);
    expect(movimientos).toEqual(expect.arrayContaining([['INTERES', 38], ['APORTE_AUTOMATICO', plan.cuotaMensualCentavos]]));
    expect(e.base.cuotas.find((c) => c.numero === 1)?.estado).toBe('EJECUTADA');
    expect((await e.consultas.corrida(corrida.id)).ejecutadas).toBe(1);
    expect((await e.consultas.corridas({ desde: '2026-10-01' }, 1, 10)).totalElementos).toBe(1);
    expect(await codigo(e.consultas.corrida('no-existe'))).toBe('NO_ENCONTRADO');
  });

  it('cinco rechazos cancelan la cuota y extienden el plazo un mes (prórroga)', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, { ...PLAN_BASE, cuentaDebitoId: CUENTA_POBRE });
    await e.corte.ejecutar('2026-10-15');
    for (let i = 0; i < 5; i++) {
      await e.procesarOutbox();
      e.reloj.avanzar(25 * 3_600_000);
      await e.corte.ejecutar('2026-10-15');
    }
    const cuota1 = e.base.cuotas.find((c) => c.planId === plan.id && c.numero === 1);
    expect(cuota1).toMatchObject({ estado: 'CANCELADA', intentos: 5 });
    const actualizado = await e.planes.obtener(CLIENTE, plan.id);
    expect(actualizado).toMatchObject({ plazoMeses: 13, prorrogasMeses: 1, fechaFinEstimada: '2027-10-15' });
    expect(e.base.cuotas.filter((c) => c.planId === plan.id)).toHaveLength(13);
  });

  it('un fallo técnico del Core no consume intentos', async () => {
    const caido = { debitar: () => Promise.reject(new CoreNoDisponibleError()) } as unknown as CoreBancarioPort;
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    const fallando = crearEntorno(caido);
    fallando.uow.base.planes.push(...e.base.planes);
    fallando.uow.base.cuotas.push(...e.base.cuotas);
    const corrida = await fallando.corte.ejecutar('2026-10-15');
    const [resultado] = await fallando.procesarOutbox();
    expect(resultado).toMatchObject({ tipo: 'DebitoFallido', datos: { causa: 'TECNICA', motivo: 'CORE_NO_DISPONIBLE' } });
    expect(fallando.base.cuotas.find((c) => c.planId === plan.id && c.numero === 1)).toMatchObject({ estado: 'PENDIENTE', intentos: 0 });
    expect(fallando.base.corridas.find((c) => c.id === corrida.id)?.erroresTecnicos).toBe(1);
  });

  it('no cobra cuotas de planes cancelados y registra corridas fallidas', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    await e.planes.cancelar(CLIENTE, plan.id);
    expect((await e.corte.ejecutar('2026-12-31')).totalCuotas).toBe(0);
    e.uow.repos.cuotas.seleccionarDebitosDelDia = () => Promise.reject(new Error('base caída'));
    expect((await e.corte.ejecutar('2026-12-31')).estado).toBe('FALLIDA');
  });
});

describe('ConsultasService', () => {
  it('pagina movimientos por cursor sin repetir ni saltar asientos', async () => {
    const e = crearEntorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    for (let i = 1; i <= 5; i++) {
      e.reloj.avanzar(1000);
      await e.dinero.solicitarAporte(CLIENTE, plan.id, i * 100);
      await e.procesarOutbox();
    }
    const p1 = await e.consultas.movimientos(CLIENTE, plan.id, { limite: 2 });
    expect(p1.hayMas).toBe(true);
    const p2 = await e.consultas.movimientos(CLIENTE, plan.id, { limite: 2, cursor: p1.siguienteCursor as string });
    const p3 = await e.consultas.movimientos(CLIENTE, plan.id, { limite: 2, cursor: p2.siguienteCursor as string });
    expect([...p1.items, ...p2.items, ...p3.items].map((m) => m.montoCentavos)).toEqual([500, 400, 300, 200, 100]);
    expect(p3).toMatchObject({ hayMas: false, siguienteCursor: null });
    expect(await codigo(e.consultas.movimientos(CLIENTE, plan.id, { limite: 2, cursor: 'basura' }))).toBe('VALIDACION');
    const cuotas = await e.consultas.cuotas(CLIENTE, plan.id, ['PROGRAMADA'], 2, 5);
    expect(cuotas).toMatchObject({ pagina: 2, totalElementos: 12, totalPaginas: 3 });
  });
});

describe('ClientesService', () => {
  it('devuelve perfil y cuentas; un cliente sin Core no tiene cuentas', async () => {
    const e = crearEntorno();
    expect(await e.clientes.perfil(CLIENTE.usuarioId)).toEqual({ id: CLIENTE.usuarioId, nombre: 'Pablo Jara', email: 'pablo@test.com' });
    expect(await e.clientes.cuentas(CLIENTE.usuarioId)).toHaveLength(2);
    expect(await e.clientes.cuentas(OTRO_CLIENTE.usuarioId)).toEqual([]);
    expect(await codigo(e.clientes.perfil('nadie'))).toBe('NO_ENCONTRADO');
    const caido = crearEntorno({ listarCuentas: () => Promise.reject(new CoreNoDisponibleError()) } as unknown as CoreBancarioPort);
    expect(await codigo(caido.clientes.cuentas(CLIENTE.usuarioId))).toBe('CORE_NO_DISPONIBLE');
    const raro = crearEntorno({ listarCuentas: () => Promise.reject(new Error('otro')) } as unknown as CoreBancarioPort);
    await expect(raro.clientes.cuentas(CLIENTE.usuarioId)).rejects.toThrow('otro');
  });
});

describe('EjecutorCoreService', () => {
  it('traduce crédito exitoso y fallido', async () => {
    const e = crearEntorno();
    const base = { id: 'ev', correlationId: 'c', ocurridoEn: '', datos: { operacionId: 'o', planId: 'p', tipoOperacion: 'RETIRO' as const, cuentaId: CUENTA, montoCentavos: 100, moneda: 'USD' as const } };
    expect((await e.ejecutor.ejecutar({ ...base, tipo: 'CreditoSolicitado' })).tipo).toBe('CreditoEjecutado');
    expect((await e.ejecutor.ejecutar({ ...base, tipo: 'CreditoSolicitado', datos: { ...base.datos, operacionId: 'o2', cuentaId: 'x' } })).datos).toMatchObject({ causa: 'NEGOCIO', motivo: 'CUENTA_BLOQUEADA' });
  });
});
