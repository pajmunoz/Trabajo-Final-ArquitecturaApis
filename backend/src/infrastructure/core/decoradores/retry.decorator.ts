import { CoreNoDisponibleError, type CoreBancarioPort } from '../../../application/ports/core-bancario.port.js';
import type { Logger } from '../../../shared/logger.js';
import { CircuitoAbiertoError } from './circuit-breaker.decorator.js';
import { DecoradorCore, type OperacionPuerto } from './decorador-core.js';

export interface OpcionesRetry {
  /** Reintentos después del primer intento (3 → esperas de 1 s, 2 s y 4 s). */
  intentos: number;
  baseMs: number;
  aleatorio?: () => number;
  esperar?: (ms: number) => Promise<void>;
}

const dormir = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

/**
 * Reintento técnico con backoff exponencial y jitter: base·2^n + aleatorio(0..base).
 * El jitter evita que muchos consumidores reintenten al mismo tiempo (estampida).
 * Solo reintenta fallos técnicos; ni los rechazos de negocio ni el circuito abierto.
 * Se usa solo en el camino asíncrono (DebitoSolicitado / CreditoSolicitado).
 */
export class RetryCoreDecorator extends DecoradorCore {
  private readonly aleatorio: () => number;
  private readonly esperar: (ms: number) => Promise<void>;

  constructor(
    interno: CoreBancarioPort,
    private readonly opciones: OpcionesRetry,
    private readonly logger?: Logger,
  ) {
    super(interno);
    this.aleatorio = opciones.aleatorio ?? Math.random;
    this.esperar = opciones.esperar ?? dormir;
  }

  /** Espera antes del reintento `n` (0, 1, 2...). */
  espera(n: number): number {
    return this.opciones.baseMs * 2 ** n + Math.floor(this.aleatorio() * this.opciones.baseMs);
  }

  protected async envolver<T>(operacion: OperacionPuerto, llamada: () => Promise<T>): Promise<T> {
    for (let intento = 0; ; intento++) {
      try {
        return await llamada();
      } catch (error) {
        const reintentable = error instanceof CoreNoDisponibleError && !(error instanceof CircuitoAbiertoError);
        if (!reintentable || intento >= this.opciones.intentos) throw error;
        const ms = this.espera(intento);
        this.logger?.warn({ operacion, intento: intento + 1, esperaMs: ms }, 'Reintentando llamada al Core');
        await this.esperar(ms);
      }
    }
  }
}
