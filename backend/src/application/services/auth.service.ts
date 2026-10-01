import { createHash, randomBytes } from 'node:crypto';
import { DomainError } from '../../domain/errors.js';
import type { Rol, UnitOfWork, Usuario } from '../ports/repositorios.js';
import type { Hasher, Reloj, TokenService } from '../ports/servicios.js';

/** Scopes por rol (tabla de seguridad del contrato). */
export const SCOPES_POR_ROL: Record<Rol, string[]> = {
  CLIENTE: ['perfil:leer', 'planes:leer', 'planes:escribir', 'aportes:escribir', 'retiros:escribir', 'movimientos:leer', 'cuentas:leer'],
  OPERADOR: ['planes:leer', 'corridas:leer'],
  AUDITOR: ['planes:leer', 'movimientos:leer', 'corridas:leer'],
};

export function scopesPara(roles: Rol[]): string[] {
  return [...new Set(roles.flatMap((rol) => SCOPES_POR_ROL[rol]))];
}

export interface Token {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken: string;
  scope: string;
}

const credencialesInvalidas = () =>
  new DomainError('CREDENCIALES_INVALIDAS', 'El email o la contraseña no son correctos.');

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Servicio de Autenticación: emite el access token (JWT RS256) y el refresh token con rotación. */
export class AuthService {
  private hashFicticio?: Promise<string>;

  constructor(
    private readonly uow: UnitOfWork,
    private readonly hasher: Hasher,
    private readonly tokens: TokenService,
    private readonly reloj: Reloj,
    private readonly refreshTtlDias: number,
  ) {}

  async conContrasena(email: string, contrasena: string): Promise<Token> {
    const usuario = await this.uow.repos.usuarios.buscarPorEmail(email.trim().toLowerCase());
    // Se compara igual aunque el usuario no exista, para no revelar qué emails están registrados.
    this.hashFicticio ??= this.hasher.hash('usuario-inexistente');
    const valida = await this.hasher.comparar(contrasena, usuario?.hashContrasena ?? (await this.hashFicticio));
    if (!usuario || !valida) throw credencialesInvalidas();
    return this.uow.ejecutar((repos) => this.emitir(usuario, repos.refreshTokens));
  }

  async conRefreshToken(refreshToken: string): Promise<Token> {
    return this.uow.ejecutar(async (repos) => {
      const hash = hashToken(refreshToken);
      const guardado = await repos.refreshTokens.buscar(hash);
      const ahora = this.reloj.ahora();
      if (!guardado || guardado.revocadoEn || new Date(guardado.expiraEn) <= ahora) {
        throw new DomainError('CREDENCIALES_INVALIDAS', 'El refresh token no es válido o expiró.');
      }
      // Rotación: el refresh token usado queda invalidado.
      if (!(await repos.refreshTokens.revocar(hash, ahora.toISOString()))) {
        throw new DomainError('CREDENCIALES_INVALIDAS', 'El refresh token no es válido o expiró.');
      }
      const usuario = await repos.usuarios.buscarPorId(guardado.usuarioId);
      if (!usuario) throw credencialesInvalidas();
      return this.emitir(usuario, repos.refreshTokens);
    });
  }

  private async emitir(usuario: Usuario, refreshTokens: { guardar: (t: { hash: string; usuarioId: string; expiraEn: string }) => Promise<void> }): Promise<Token> {
    const scope = scopesPara(usuario.roles).join(' ');
    const accessToken = this.tokens.firmarAcceso({ sub: usuario.id, roles: usuario.roles, scope });
    const refreshToken = `rt_${randomBytes(32).toString('hex')}`;
    const expiraEn = new Date(this.reloj.ahora().getTime() + this.refreshTtlDias * 86_400_000).toISOString();
    await refreshTokens.guardar({ hash: hashToken(refreshToken), usuarioId: usuario.id, expiraEn });
    return { accessToken, tokenType: 'Bearer', expiresIn: this.tokens.ttlAccesoSegundos, refreshToken, scope };
  }
}
