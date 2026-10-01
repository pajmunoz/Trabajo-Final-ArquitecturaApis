import { proximaFechaConDia } from '../../../domain/fechas.js';
import type { OperacionCore } from '../../../domain/operaciones.js';
import { progreso, saldoDisponible, type PlanAhorro } from '../../../domain/plan/plan-ahorro.js';

/** Representación pública del plan según el contrato (sin campos internos). */
export function planAJson(plan: PlanAhorro, hoy: string) {
  return {
    id: plan.id,
    nombre: plan.nombre,
    ...(plan.objetivo !== undefined && { objetivo: plan.objetivo }),
    icono: plan.icono,
    estado: plan.estado,
    moneda: plan.moneda,
    montoMetaCentavos: plan.montoMetaCentavos,
    fechaObjetivo: plan.fechaObjetivo,
    cuotaMensualCentavos: plan.cuotaMensualCentavos,
    plazoMeses: plan.plazoMeses,
    prorrogasMeses: plan.prorrogasMeses,
    diaDebito: plan.diaDebito,
    cuentaDebito: plan.cuentaDebito,
    bloqueado: plan.bloqueado,
    bloqueadoDesde: plan.bloqueadoDesde,
    tasas: plan.tasas,
    saldoCentavos: plan.saldoCentavos,
    saldoDisponibleCentavos: saldoDisponible(plan),
    interesesDevengadosCentavos: plan.interesesDevengadosCentavos,
    progreso: progreso(plan),
    proximoDebito: plan.estado === 'ACTIVO' ? proximaFechaConDia(hoy, plan.diaDebito) : null,
    fechaInicio: plan.fechaInicio,
    fechaFinEstimada: plan.fechaFinEstimada,
    creadoEn: plan.creadoEn,
    actualizadoEn: plan.actualizadoEn,
  };
}

export const etagDe = (plan: Pick<PlanAhorro, 'version'>) => `W/"v${plan.version}"`;

/** Lee la versión de un If-Match W/"v3" o "v3". */
export function versionDeIfMatch(valor: string | undefined): number | undefined {
  const coincidencia = valor?.match(/v(\d+)/);
  return coincidencia ? Number(coincidencia[1]) : valor ? -1 : undefined;
}

function operacionAJson(o: OperacionCore, campoCuenta: 'cuentaOrigen' | 'cuentaDestino') {
  return {
    id: o.id,
    planId: o.planId,
    montoCentavos: o.montoCentavos,
    moneda: o.moneda,
    [campoCuenta]: o.cuenta,
    estado: o.estado,
    solicitadoEn: o.solicitadoEn,
    procesadoEn: o.procesadoEn,
    motivoFallo: o.motivoFallo,
    correlationId: o.correlationId,
  };
}

export const aporteAJson = (o: OperacionCore) => operacionAJson(o, 'cuentaOrigen');
export const retiroAJson = (o: OperacionCore) => operacionAJson(o, 'cuentaDestino');
