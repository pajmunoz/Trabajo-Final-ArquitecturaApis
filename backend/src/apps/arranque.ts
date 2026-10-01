import type { Server } from 'node:http';
import type { Logger } from '../shared/logger.js';

/** Cierre ordenado: deja de aceptar conexiones y libera recursos ante SIGTERM/SIGINT. */
export function cierreOrdenado(logger: Logger, servidor: Server | undefined, liberar: Array<() => Promise<unknown> | unknown>): void {
  let cerrando = false;
  const cerrar = (senal: string) => {
    if (cerrando) return;
    cerrando = true;
    logger.info({ senal }, 'Cerrando proceso');
    const terminar = async () => {
      for (const paso of liberar) await Promise.resolve(paso()).catch(() => undefined);
      process.exit(0);
    };
    if (servidor) servidor.close(() => void terminar());
    else void terminar();
  };
  process.on('SIGTERM', () => cerrar('SIGTERM'));
  process.on('SIGINT', () => cerrar('SIGINT'));
}

export function fallaAlIniciar(logger: Logger) {
  return (error: unknown) => {
    logger.fatal({ err: error }, 'No se pudo iniciar el proceso');
    process.exit(1);
  };
}
