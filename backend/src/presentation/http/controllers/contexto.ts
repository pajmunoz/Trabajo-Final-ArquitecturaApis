import type { Response } from 'express';
import type { Actor } from '../../../application/services/comunes.js';
import { DomainError } from '../../../domain/errors.js';

/** Actor autenticado (lo deja el middleware `autenticar`). */
export function actorDe(res: Response): Actor {
  const actor = res.locals.actor;
  if (!actor) throw new DomainError('TOKEN_INVALIDO', 'Falta el token de acceso.');
  return actor;
}

export const planIdDe = (res: Response) => (res.locals.params as { planId: string }).planId;
