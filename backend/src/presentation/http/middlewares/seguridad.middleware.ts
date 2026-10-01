import type { RequestHandler } from 'express';
import type { Actor } from '../../../application/services/comunes.js';
import type { TokenService } from '../../../application/ports/servicios.js';
import { DomainError } from '../../../domain/errors.js';

declare module 'express-serve-static-core' {
  interface Locals {
    actor?: Actor & { scopes: string[] };
    requestId?: string;
  }
}

/**
 * Valida el JWT (firma RS256, emisor, audiencia y expiración). El Gateway ya lo
 * valida en el borde; la API lo vuelve a validar (defensa en profundidad) porque
 * necesita los claims para los scopes y la titularidad.
 */
export function autenticar(tokens: TokenService): RequestHandler {
  return (req, res, next) => {
    const [esquema, token] = (req.headers.authorization ?? '').split(' ');
    if (esquema !== 'Bearer' || !token) {
      next(new DomainError('TOKEN_INVALIDO', 'Falta el token de acceso.'));
      return;
    }
    const claims = tokens.verificarAcceso(token);
    res.locals.actor = { usuarioId: claims.sub, roles: claims.roles, scopes: claims.scope.split(' ').filter(Boolean) };
    next();
  };
}

/** RBAC por scope granular de recurso (planes:leer, retiros:escribir...). */
export function requerir(...scopes: string[]): RequestHandler {
  return (_req, res, next) => {
    const faltante = scopes.find((s) => !res.locals.actor?.scopes.includes(s));
    if (faltante) {
      next(new DomainError('PERMISO_INSUFICIENTE', `Se requiere el scope ${faltante}.`));
      return;
    }
    next();
  };
}
