import type { MotivoFallo } from '../../domain/operaciones.js';
import type { CuentaDebito } from '../../domain/plan/plan-ahorro.js';

export interface SolicitudMovimientoCore {
  /** Referencia única: el Core la usa para no aplicar dos veces el mismo movimiento. */
  operacionId: string;
  cuentaId: string;
  montoCentavos: number;
}

/**
 * Patrón Adapter: puerto que el dominio usa para hablar con el Core bancario.
 * Implementaciones: CoreLegacyAdapter (HTTP contra el Core) y CoreSimuladoAdapter
 * (en memoria, para pruebas). La resiliencia se agrega con decoradores.
 */
export interface CoreBancarioPort {
  listarCuentas(clienteCoreId: string): Promise<CuentaDebito[]>;
  obtenerCuenta(clienteCoreId: string, cuentaId: string): Promise<CuentaDebito | null>;
  debitar(solicitud: SolicitudMovimientoCore): Promise<void>;
  acreditar(solicitud: SolicitudMovimientoCore): Promise<void>;
}

/** El Core respondió y rechazó la operación (regla de negocio). No se reintenta. */
export class CoreRechazoError extends Error {
  constructor(public readonly motivo: Exclude<MotivoFallo, 'CORE_NO_DISPONIBLE'>) {
    super(`El Core rechazó la operación: ${motivo}`);
    this.name = 'CoreRechazoError';
  }
}

/** El Core no respondió, respondió con error o el Circuit Breaker está abierto. */
export class CoreNoDisponibleError extends Error {
  constructor(message = 'El Core bancario no está disponible', public readonly causa?: unknown) {
    super(message);
    this.name = 'CoreNoDisponibleError';
  }
}
