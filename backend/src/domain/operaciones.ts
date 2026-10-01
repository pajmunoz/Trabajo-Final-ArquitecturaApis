import type { CuentaDebito } from './plan/plan-ahorro.js';

export type EstadoOperacion = 'PENDIENTE' | 'EJECUTADO' | 'FALLIDO';

/** Movimiento de dinero entre un plan y una cuenta del Core. */
export type TipoOperacion = 'APORTE' | 'CUOTA' | 'RETIRO' | 'DEVOLUCION';

export type MotivoFallo = 'FONDOS_INSUFICIENTES' | 'CUENTA_BLOQUEADA' | 'CORE_NO_DISPONIBLE';

export interface OperacionCore {
  id: string;
  planId: string;
  tipo: TipoOperacion;
  montoCentavos: number;
  moneda: 'USD';
  cuenta: CuentaDebito;
  estado: EstadoOperacion;
  motivoFallo: MotivoFallo | null;
  cuotaId: string | null;
  corridaId: string | null;
  correlationId: string;
  solicitadoEn: string;
  procesadoEn: string | null;
}

export const esDebito = (tipo: TipoOperacion) => tipo === 'APORTE' || tipo === 'CUOTA';

export type TipoMovimiento = 'APORTE_AUTOMATICO' | 'APORTE_MANUAL' | 'INTERES' | 'RETIRO' | 'PENALIDAD' | 'DEVOLUCION';

/** Asiento del ledger de solo inserción (RNF-03.3). */
export interface Movimiento {
  id: string;
  planId: string;
  tipo: TipoMovimiento;
  montoCentavos: number;
  moneda: 'USD';
  saldoResultanteCentavos: number;
  fecha: string;
  descripcion: string;
  origen: string;
  referencia: { tipo: 'CUOTA' | 'APORTE' | 'RETIRO' | 'DESBLOQUEO' | 'CANCELACION'; id: string } | null;
  correlationId: string | null;
}

export function etiquetaCuenta(cuenta: Pick<CuentaDebito, 'tipo' | 'numeroEnmascarado'>): string {
  const tipo = cuenta.tipo === 'AHORROS' ? 'Cuenta de Ahorros' : 'Cuenta Corriente';
  return `${tipo} •• ${cuenta.numeroEnmascarado.slice(-4)}`;
}
