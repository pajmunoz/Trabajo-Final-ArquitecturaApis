import {
  CoreNoDisponibleError,
  CoreRechazoError,
  type CoreBancarioPort,
  type SolicitudMovimientoCore,
} from '../../application/ports/core-bancario.port.js';
import type { CuentaDebito } from '../../domain/plan/plan-ahorro.js';

/** Forma de las cuentas en la API del Core (montos decimales en texto, como Decimal128). */
interface CuentaCore {
  id: string;
  alias?: string;
  numeroCuenta: string;
  tipoCuenta: 'AHORROS' | 'CORRIENTE';
  moneda: 'USD';
  saldo: string;
}

const aCentavos = (decimal: string) => Math.round(Number(decimal) * 100);
const aDecimal = (centavos: number) => (centavos / 100).toFixed(2);

const aCuentaDebito = (c: CuentaCore): CuentaDebito => ({
  id: c.id,
  ...(c.alias && { alias: c.alias }),
  numeroEnmascarado: `******${c.numeroCuenta.slice(-4)}`,
  tipo: c.tipoCuenta,
  moneda: c.moneda,
  saldoDisponibleCentavos: aCentavos(c.saldo),
});

/**
 * Patrón Adapter (CoreLegacyAdapter): traduce el puerto del dominio a la interfaz
 * REST del Core bancario. Montos: centavos ↔ decimales; errores HTTP ↔ errores
 * del puerto. No tiene lógica de resiliencia: la agregan los decoradores.
 */
export class CoreLegacyAdapter implements CoreBancarioPort {
  constructor(
    private readonly baseUrl: string,
    private readonly limiteSeguridadMs = 10_000,
  ) {}

  async listarCuentas(clienteCoreId: string): Promise<CuentaDebito[]> {
    const respuesta = await this.llamar(`/clientes/${encodeURIComponent(clienteCoreId)}/cuentas`);
    if (respuesta.status === 404) return [];
    const cuentas = (await respuesta.json()) as CuentaCore[];
    return cuentas.map(aCuentaDebito);
  }

  async obtenerCuenta(clienteCoreId: string, cuentaId: string): Promise<CuentaDebito | null> {
    const respuesta = await this.llamar(`/clientes/${encodeURIComponent(clienteCoreId)}/cuentas/${encodeURIComponent(cuentaId)}`);
    if (respuesta.status === 404) return null;
    return aCuentaDebito((await respuesta.json()) as CuentaCore);
  }

  debitar(solicitud: SolicitudMovimientoCore): Promise<void> {
    return this.movimiento('/debitos', solicitud);
  }

  acreditar(solicitud: SolicitudMovimientoCore): Promise<void> {
    return this.movimiento('/creditos', solicitud);
  }

  private async movimiento(ruta: string, s: SolicitudMovimientoCore): Promise<void> {
    const respuesta = await this.llamar(ruta, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ referencia: s.operacionId, cuentaId: s.cuentaId, monto: aDecimal(s.montoCentavos) }),
    });
    if (respuesta.status === 422) {
      const { codigo } = (await respuesta.json()) as { codigo?: string };
      throw new CoreRechazoError(codigo === 'CUENTA_BLOQUEADA' ? 'CUENTA_BLOQUEADA' : 'FONDOS_INSUFICIENTES');
    }
  }

  /** Errores de red y respuestas 5xx son fallos técnicos (cuentan para el Circuit Breaker). */
  private async llamar(ruta: string, init: RequestInit = {}): Promise<Response> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${this.baseUrl}${ruta}`, { ...init, signal: AbortSignal.timeout(this.limiteSeguridadMs) });
    } catch (error) {
      throw new CoreNoDisponibleError('No se pudo conectar con el Core bancario', error);
    }
    if (respuesta.status >= 500) {
      throw new CoreNoDisponibleError(`El Core bancario respondió ${respuesta.status}`);
    }
    return respuesta;
  }
}
