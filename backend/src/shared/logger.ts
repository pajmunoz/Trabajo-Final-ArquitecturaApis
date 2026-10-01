import { pino, type Logger } from 'pino';

/** Logger estructurado (JSON) compartido por todos los procesos. */
export function crearLogger(servicio: string, nivel = process.env.LOG_LEVEL ?? 'info'): Logger {
  return pino({
    name: servicio,
    level: process.env.NODE_ENV === 'test' ? 'silent' : nivel,
    redact: {
      paths: ['req.headers.authorization', 'contrasena', 'refreshToken', '*.contrasena', '*.refreshToken'],
      censor: '[oculto]',
    },
  });
}

export type { Logger };
