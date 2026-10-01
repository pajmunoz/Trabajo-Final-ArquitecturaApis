import {
  CoreRechazoError,
  type CoreBancarioPort,
  type SolicitudMovimientoCore,
} from '../../application/ports/core-bancario.port.js';
import type { CuentaDebito } from '../../domain/plan/plan-ahorro.js';

interface CuentaEnMemoria extends CuentaDebito {
  clienteCoreId: string;
  saldoDisponibleCentavos: number;
  bloqueada?: boolean;
}

/**
 * Patrón Adapter (CoreSimuladoAdapter): implementación en memoria del puerto, para
 * pruebas unitarias y para correr la API sin el Core. Es idempotente por operación.
 */
export class CoreSimuladoAdapter implements CoreBancarioPort {
  private readonly aplicadas = new Set<string>();

  constructor(private readonly cuentas: CuentaEnMemoria[] = []) {}

  async listarCuentas(clienteCoreId: string): Promise<CuentaDebito[]> {
    return this.cuentas.filter((c) => c.clienteCoreId === clienteCoreId).map(({ clienteCoreId: _c, bloqueada: _b, ...cuenta }) => ({ ...cuenta }));
  }

  async obtenerCuenta(clienteCoreId: string, cuentaId: string): Promise<CuentaDebito | null> {
    return (await this.listarCuentas(clienteCoreId)).find((c) => c.id === cuentaId) ?? null;
  }

  async debitar(s: SolicitudMovimientoCore): Promise<void> {
    this.aplicar(s, -s.montoCentavos);
  }

  async acreditar(s: SolicitudMovimientoCore): Promise<void> {
    this.aplicar(s, s.montoCentavos);
  }

  saldoDe(cuentaId: string): number | undefined {
    return this.cuentas.find((c) => c.id === cuentaId)?.saldoDisponibleCentavos;
  }

  private aplicar(s: SolicitudMovimientoCore, delta: number): void {
    if (this.aplicadas.has(s.operacionId)) return;
    const cuenta = this.cuentas.find((c) => c.id === s.cuentaId);
    if (!cuenta || cuenta.bloqueada) throw new CoreRechazoError('CUENTA_BLOQUEADA');
    if (cuenta.saldoDisponibleCentavos + delta < 0) throw new CoreRechazoError('FONDOS_INSUFICIENTES');
    cuenta.saldoDisponibleCentavos += delta;
    this.aplicadas.add(s.operacionId);
  }
}
