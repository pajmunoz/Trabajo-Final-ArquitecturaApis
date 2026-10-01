import { createHash } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { IdempotenciaRepository } from '../../../application/ports/repositorios.js';
import { DomainError } from '../../../domain/errors.js';
import type { Logger } from '../../../shared/logger.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS_A_GUARDAR = ['location', 'etag'];

/**
 * Idempotency-Key: un reintento con la misma clave y el mismo cuerpo devuelve la
 * respuesta original (con Idempotent-Replayed: true); con otro cuerpo, 409.
 * Evita crear dos planes o mover dinero dos veces por un reintento de red.
 */
export function idempotencia(repo: IdempotenciaRepository, logger: Logger): RequestHandler {
  return async (req, res, next) => {
    const clave = req.header('idempotency-key');
    if (!clave || !UUID.test(clave)) {
      next(
        new DomainError('VALIDACION', 'El header Idempotency-Key es obligatorio y debe ser un UUID.', [
          { campo: 'Idempotency-Key', mensaje: 'UUID requerido' },
        ]),
      );
      return;
    }
    const usuarioId = res.locals.actor?.usuarioId ?? 'anonimo';
    const operacion = `${req.method} ${req.originalUrl.split('?')[0]}`;
    const hashCuerpo = createHash('sha256').update(JSON.stringify(req.body ?? {})).digest('hex');

    try {
      const previa = await repo.buscar(clave, usuarioId, operacion);
      if (previa) {
        if (previa.hashCuerpo !== hashCuerpo) {
          next(new DomainError('IDEMPOTENCIA_CONFLICTO', 'La clave ya se usó con un cuerpo distinto.'));
          return;
        }
        for (const [nombre, valor] of Object.entries(previa.headers)) res.setHeader(nombre, valor);
        res.setHeader('Idempotent-Replayed', 'true');
        res.status(previa.status).json(previa.cuerpo);
        return;
      }
    } catch (error) {
      next(error);
      return;
    }

    // Captura la respuesta del controlador para guardarla si fue exitosa.
    const jsonOriginal = res.json.bind(res);
    res.json = (cuerpo: unknown) => {
      if (res.statusCode < 400) {
        const headers = Object.fromEntries(
          HEADERS_A_GUARDAR.flatMap((h) => {
            const valor = res.getHeader(h);
            return valor === undefined ? [] : [[h, String(valor)]];
          }),
        );
        repo
          .guardar({ clave, usuarioId, operacion, hashCuerpo, status: res.statusCode, cuerpo, headers })
          .catch((error: unknown) => logger.error({ err: error }, 'No se pudo guardar la respuesta idempotente'));
        res.setHeader('Idempotent-Replayed', 'false');
      }
      return jsonOriginal(cuerpo);
    };
    next();
  };
}
