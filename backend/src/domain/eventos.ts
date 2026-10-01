import type { MotivoFallo, TipoOperacion } from './operaciones.js';

/**
 * Eventos de dominio (patrón Observer). Viajan por RabbitMQ con este sobre;
 * el `id` permite a los consumidores descartar duplicados (consumidor idempotente).
 */
export interface Evento<T extends string = string, D = unknown> {
  id: string;
  tipo: T;
  correlationId: string;
  ocurridoEn: string;
  datos: D;
}

export interface DatosSolicitudCore {
  operacionId: string;
  planId: string;
  tipoOperacion: TipoOperacion;
  cuentaId: string;
  montoCentavos: number;
  moneda: 'USD';
}

export interface DatosResultadoCore {
  operacionId: string;
  planId: string;
  tipoOperacion: TipoOperacion;
  /** Solo en *Fallido: NEGOCIO (rechazo del Core) o TECNICA (Core caído, timeout). */
  causa?: 'NEGOCIO' | 'TECNICA';
  motivo?: MotivoFallo;
}

export interface DatosPlan {
  planId: string;
  clienteId: string;
  nombre: string;
}

export type DebitoSolicitado = Evento<'DebitoSolicitado', DatosSolicitudCore>;
export type CreditoSolicitado = Evento<'CreditoSolicitado', DatosSolicitudCore>;
export type ResultadoCore = Evento<
  'DebitoEjecutado' | 'DebitoFallido' | 'CreditoEjecutado' | 'CreditoFallido',
  DatosResultadoCore
>;

export const TIPOS_SOLICITUD = ['DebitoSolicitado', 'CreditoSolicitado'] as const;
export const TIPOS_RESULTADO = ['DebitoEjecutado', 'DebitoFallido', 'CreditoEjecutado', 'CreditoFallido'] as const;
