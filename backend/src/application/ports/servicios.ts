import type { Rol } from './repositorios.js';

export interface Reloj {
  ahora(): Date;
}

export interface GeneradorId {
  uuid(): string;
}

export interface ClaimsAcceso {
  sub: string;
  roles: Rol[];
  scope: string;
}

export interface TokenService {
  firmarAcceso(claims: ClaimsAcceso): string;
  /** Lanza DomainError('TOKEN_INVALIDO') si la firma, la expiración o el emisor no son válidos. */
  verificarAcceso(token: string): ClaimsAcceso;
  readonly ttlAccesoSegundos: number;
}

export interface Hasher {
  hash(valor: string): Promise<string>;
  comparar(valor: string, hash: string): Promise<boolean>;
}

export const relojSistema: Reloj = { ahora: () => new Date() };
export const generadorUuid: GeneradorId = { uuid: () => crypto.randomUUID() };
