import jwt from 'jsonwebtoken';
import type { Rol } from '../../application/ports/repositorios.js';
import type { ClaimsAcceso, TokenService } from '../../application/ports/servicios.js';
import { DomainError } from '../../domain/errors.js';

export interface OpcionesJwt {
  /** Solo el Servicio de Autenticación tiene la clave privada; la API solo verifica. */
  clavePrivada?: string;
  clavePublica: string;
  emisor: string;
  audiencia: string;
  ttlSegundos: number;
}

/** Access token JWT firmado con RS256 (15 minutos). */
export class JwtTokenService implements TokenService {
  readonly ttlAccesoSegundos: number;

  constructor(private readonly opciones: OpcionesJwt) {
    this.ttlAccesoSegundos = opciones.ttlSegundos;
  }

  firmarAcceso(claims: ClaimsAcceso): string {
    if (!this.opciones.clavePrivada) throw new Error('Este proceso no tiene la clave privada para firmar tokens');
    return jwt.sign({ roles: claims.roles, scope: claims.scope }, this.opciones.clavePrivada, {
      algorithm: 'RS256',
      subject: claims.sub,
      issuer: this.opciones.emisor,
      audience: this.opciones.audiencia,
      expiresIn: this.opciones.ttlSegundos,
      jwtid: crypto.randomUUID(),
      // Kong valida la firma buscando la credencial por este claim.
      keyid: this.opciones.emisor,
    });
  }

  verificarAcceso(token: string): ClaimsAcceso {
    try {
      const payload = jwt.verify(token, this.opciones.clavePublica, {
        algorithms: ['RS256'],
        issuer: this.opciones.emisor,
        audience: this.opciones.audiencia,
      }) as jwt.JwtPayload;
      if (typeof payload.sub !== 'string' || typeof payload.scope !== 'string' || !Array.isArray(payload.roles)) {
        throw new Error('claims incompletos');
      }
      return { sub: payload.sub, roles: payload.roles as Rol[], scope: payload.scope };
    } catch (error) {
      const expirado = error instanceof jwt.TokenExpiredError;
      throw new DomainError('TOKEN_INVALIDO', expirado ? 'El token expiró.' : 'El token no es válido.');
    }
  }
}
