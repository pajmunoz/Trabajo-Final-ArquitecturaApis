import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { DomainError } from '../../../domain/errors.js';
import type { Logger } from '../../../shared/logger.js';
import { problemaDe, problemaDeError, type Problema } from '../problem.js';

export function enviarProblema(res: Response, problema: Problema): void {
  if (problema.status === 401) res.setHeader('WWW-Authenticate', `Bearer error="invalid_token", error_description="${problema.detail ?? ''}"`);
  if (problema.status === 503) res.setHeader('Retry-After', '5');
  res.status(problema.status).type('application/problem+json').json(problema);
}

export const rutaNoEncontrada: RequestHandler = (req, res) => {
  enviarProblema(res, problemaDe('NO_ENCONTRADO', `No existe la ruta ${req.method} ${req.path}.`, req.originalUrl));
};

/** Manejo centralizado de errores: todo error sale como application/problem+json. */
export function manejadorErrores(logger: Logger): ErrorRequestHandler {
  return (error: unknown, req, res, _next) => {
    if (error instanceof DomainError) {
      enviarProblema(res, problemaDeError(error, req.originalUrl));
      return;
    }
    // JSON mal formado o tipo de contenido no soportado (lanzados por express.json).
    const status = (error as { status?: number; type?: string }).status;
    if (status === 400) {
      enviarProblema(res, problemaDe('VALIDACION', 'El cuerpo no es un JSON válido.', req.originalUrl));
      return;
    }
    if (status === 415) {
      res.status(415).type('application/problem+json').json({
        type: 'https://api.billetera-ahorro.example.com/problemas/tipo-no-soportado',
        title: 'Tipo de contenido no soportado',
        status: 415,
        codigo: 'VALIDACION',
      });
      return;
    }
    logger.error({ err: error, requestId: res.locals.requestId }, 'Error no controlado');
    enviarProblema(
      res,
      problemaDe('ERROR_INTERNO', `Ocurrió un error inesperado. Referencia ${String(res.locals.requestId ?? '')}.`, req.originalUrl),
    );
  };
}
