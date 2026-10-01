import { CoreNoDisponibleError, type CoreBancarioPort } from '../../../application/ports/core-bancario.port.js';
import { DecoradorCore, type OperacionPuerto } from './decorador-core.js';

/** Corta la espera a los `limiteMs` (2 s): una respuesta lenta del Core no debe romper el p95. */
export class TimeoutCoreDecorator extends DecoradorCore {
  constructor(
    interno: CoreBancarioPort,
    private readonly limiteMs: number,
  ) {
    super(interno);
  }

  protected envolver<T>(operacion: OperacionPuerto, llamada: () => Promise<T>): Promise<T> {
    let temporizador: NodeJS.Timeout | undefined;
    const limite = new Promise<never>((_, rechazar) => {
      temporizador = setTimeout(
        () => rechazar(new CoreNoDisponibleError(`El Core no respondió en ${this.limiteMs} ms (${operacion})`)),
        this.limiteMs,
      );
    });
    return Promise.race([llamada(), limite]).finally(() => clearTimeout(temporizador));
  }
}
