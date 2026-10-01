import type { CoreBancarioPort, SolicitudMovimientoCore } from '../../../application/ports/core-bancario.port.js';
import type { CuentaDebito } from '../../../domain/plan/plan-ahorro.js';

export type OperacionPuerto = keyof CoreBancarioPort;

/**
 * Patrón Decorator: base común. Cada decorador implementa el mismo puerto,
 * envuelve a otro y agrega un comportamiento en `envolver` sin modificar al
 * adaptador. Se componen como: Retry → CircuitBreaker → Logging → Timeout → Adapter.
 */
export abstract class DecoradorCore implements CoreBancarioPort {
  constructor(protected readonly interno: CoreBancarioPort) {}

  protected abstract envolver<T>(operacion: OperacionPuerto, llamada: () => Promise<T>): Promise<T>;

  listarCuentas(clienteCoreId: string): Promise<CuentaDebito[]> {
    return this.envolver('listarCuentas', () => this.interno.listarCuentas(clienteCoreId));
  }

  obtenerCuenta(clienteCoreId: string, cuentaId: string): Promise<CuentaDebito | null> {
    return this.envolver('obtenerCuenta', () => this.interno.obtenerCuenta(clienteCoreId, cuentaId));
  }

  debitar(solicitud: SolicitudMovimientoCore): Promise<void> {
    return this.envolver('debitar', () => this.interno.debitar(solicitud));
  }

  acreditar(solicitud: SolicitudMovimientoCore): Promise<void> {
    return this.envolver('acreditar', () => this.interno.acreditar(solicitud));
  }
}
