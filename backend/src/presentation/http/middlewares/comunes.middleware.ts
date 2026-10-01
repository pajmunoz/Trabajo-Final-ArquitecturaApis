import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { DomainError } from '../../../domain/errors.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Respeta el X-Request-Id del cliente (o del Gateway) o genera uno, y lo devuelve en la respuesta. */
export const requestId: RequestHandler = (req, res, next) => {
  const recibido = req.header('x-request-id');
  const id = recibido && UUID.test(recibido) ? recibido : randomUUID();
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};

type Parte = 'body' | 'params' | 'query' | 'headers';

/** Valida una parte de la petición con Zod y deja el resultado tipado en res.locals[parte]. */
export function validar(esquema: ZodType, parte: Parte): RequestHandler {
  return (req, res, next) => {
    const resultado = esquema.safeParse(req[parte] ?? {});
    if (!resultado.success) {
      const errores = resultado.error.issues.map((i) => ({ campo: i.path.join('.') || parte, mensaje: i.message }));
      next(new DomainError('VALIDACION', `La petición tiene ${errores.length} error(es) de validación.`, errores));
      return;
    }
    (res.locals as Record<string, unknown>)[parte] = resultado.data;
    next();
  };
}

/** Exige un Content-Type concreto (PATCH usa application/merge-patch+json). */
export function exigirContenido(tipo: string): RequestHandler {
  return (req, res, next) => {
    if (!req.is(tipo)) {
      res.status(415).type('application/problem+json').json({
        type: 'https://api.billetera-ahorro.example.com/problemas/tipo-no-soportado',
        title: 'Tipo de contenido no soportado',
        status: 415,
        codigo: 'VALIDACION',
        detail: `Se esperaba ${tipo}.`,
      });
      return;
    }
    next();
  };
}

/** Respuestas públicas cacheables por el Gateway y el navegador. */
export function cacheable(segundos: number): RequestHandler {
  return (_req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${segundos}`);
    next();
  };
}
