import CircuitBreaker from 'opossum';
import {
  CoreNoDisponibleError,
  CoreRechazoError,
  type CoreBancarioPort,
} from '../../../application/ports/core-bancario.port.js';
import type { Logger } from '../../../shared/logger.js';
import { DecoradorCore, type OperacionPuerto } from './decorador-core.js';

export interface OpcionesCircuitBreaker {
  /** % de fallos en la ventana que abre el circuito (50 %). */
  umbralErrorPorcentaje: number;
  /** Ventana de medición (10 s). */
  ventanaMs: number;
  /** Tiempo abierto antes de pasar a semiabierto (30 s). */
  resetMs: number;
  /** Llamadas mínimas en la ventana antes de evaluar el umbral. */
  volumenMinimo?: number;
}

/** Error que marca que el circuito estaba abierto: el Retry no debe reintentarlo. */
export class CircuitoAbiertoError extends CoreNoDisponibleError {
  constructor() {
    super('Circuit Breaker abierto: el Core se considera no disponible');
    this.name = 'CircuitoAbiertoError';
  }
}

/**
 * Circuit Breaker (opossum) con la máquina de estados vista en clase:
 * cerrado → abierto (más del 50 % de fallos en 10 s) → semiabierto (a los 30 s).
 * Los rechazos de negocio NO cuentan como fallo: el Core respondió bien.
 */
export class CircuitBreakerCoreDecorator extends DecoradorCore {
  private readonly breaker: CircuitBreaker<[() => Promise<unknown>], unknown>;

  constructor(interno: CoreBancarioPort, opciones: OpcionesCircuitBreaker, logger?: Logger) {
    super(interno);
    this.breaker = new CircuitBreaker((llamada: () => Promise<unknown>) => llamada(), {
      timeout: false,
      errorThresholdPercentage: opciones.umbralErrorPorcentaje,
      rollingCountTimeout: opciones.ventanaMs,
      resetTimeout: opciones.resetMs,
      volumeThreshold: opciones.volumenMinimo ?? 5,
      errorFilter: (error: unknown) => error instanceof CoreRechazoError,
    });
    this.breaker.on('open', () => logger?.warn('Circuit Breaker del Core: ABIERTO'));
    this.breaker.on('halfOpen', () => logger?.info('Circuit Breaker del Core: SEMIABIERTO'));
    this.breaker.on('close', () => logger?.info('Circuit Breaker del Core: CERRADO'));
  }

  get estado(): 'CERRADO' | 'ABIERTO' | 'SEMIABIERTO' {
    if (this.breaker.opened) return 'ABIERTO';
    return this.breaker.halfOpen ? 'SEMIABIERTO' : 'CERRADO';
  }

  protected async envolver<T>(_operacion: OperacionPuerto, llamada: () => Promise<T>): Promise<T> {
    try {
      return (await this.breaker.fire(llamada)) as T;
    } catch (error) {
      if ((error as { code?: string }).code === 'EOPENBREAKER') throw new CircuitoAbiertoError();
      throw error;
    }
  }

  apagar(): void {
    this.breaker.shutdown();
  }
}
