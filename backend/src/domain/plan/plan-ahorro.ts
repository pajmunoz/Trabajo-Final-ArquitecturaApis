import type { Tasas } from '../tarifas.js';

export type EstadoPlan = 'ACTIVO' | 'COMPLETADO' | 'CANCELADO';

export type Icono =
  | 'shield'
  | 'flight_takeoff'
  | 'directions_car'
  | 'home'
  | 'school'
  | 'celebration'
  | 'savings'
  | 'favorite';

export const ICONOS: readonly Icono[] = [
  'shield',
  'flight_takeoff',
  'directions_car',
  'home',
  'school',
  'celebration',
  'savings',
  'favorite',
];

export interface CuentaDebito {
  id: string;
  alias?: string;
  numeroEnmascarado: string;
  tipo: 'AHORROS' | 'CORRIENTE';
  moneda: 'USD';
  saldoDisponibleCentavos?: number;
}

/**
 * Plan de ahorro tal como lo maneja el dominio. Los saldos (`saldoCentavos`,
 * `interesesDevengadosCentavos`, `reservadoCentavos`) no se guardan: el
 * repositorio los calcula desde el ledger y las operaciones pendientes.
 */
export interface PlanAhorro {
  id: string;
  clienteId: string;
  nombre: string;
  objetivo?: string;
  icono: Icono;
  estado: EstadoPlan;
  moneda: 'USD';
  montoMetaCentavos: number;
  fechaObjetivo: string;
  cuotaMensualCentavos: number;
  plazoMeses: number;
  prorrogasMeses: number;
  diaDebito: number;
  cuentaDebito: CuentaDebito;
  bloqueado: boolean;
  bloqueadoDesde: string | null;
  tasas: Tasas;
  saldoCentavos: number;
  reservadoCentavos: number;
  interesesDevengadosCentavos: number;
  fechaInicio: string;
  fechaFinEstimada: string;
  version: number;
  creadoEn: string;
  actualizadoEn: string;
}

/** Campo calculado del contrato: saldo / meta × 100 con dos decimales (RF-05.1). */
export function progreso(plan: Pick<PlanAhorro, 'saldoCentavos' | 'montoMetaCentavos'>): number {
  if (plan.montoMetaCentavos <= 0) return 0;
  return Math.min(100, Math.round((plan.saldoCentavos / plan.montoMetaCentavos) * 10000) / 100);
}

/** Lo que se puede retirar: saldo menos retiros pendientes de acreditar. */
export function saldoDisponible(plan: Pick<PlanAhorro, 'saldoCentavos' | 'reservadoCentavos'>): number {
  return Math.max(0, plan.saldoCentavos - plan.reservadoCentavos);
}
