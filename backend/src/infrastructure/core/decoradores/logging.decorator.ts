import { CoreRechazoError, type CoreBancarioPort } from '../../../application/ports/core-bancario.port.js';
import type { Logger } from '../../../shared/logger.js';
import { DecoradorCore, type OperacionPuerto } from './decorador-core.js';

/** Registra cada llamada al Core con su duración y resultado (logs que pide la rúbrica). */
export class LoggingCoreDecorator extends DecoradorCore {
  constructor(
    interno: CoreBancarioPort,
    private readonly logger: Logger,
    private readonly ahora: () => number = () => performance.now(),
  ) {
    super(interno);
  }

  protected async envolver<T>(operacion: OperacionPuerto, llamada: () => Promise<T>): Promise<T> {
    const inicio = this.ahora();
    try {
      const resultado = await llamada();
      this.logger.info({ operacion, duracionMs: Math.round(this.ahora() - inicio), resultado: 'OK' }, 'Llamada al Core');
      return resultado;
    } catch (error) {
      const rechazo = error instanceof CoreRechazoError;
      this.logger[rechazo ? 'info' : 'warn'](
        { operacion, duracionMs: Math.round(this.ahora() - inicio), resultado: rechazo ? 'RECHAZO' : 'ERROR', err: error },
        'Llamada al Core',
      );
      throw error;
    }
  }
}
