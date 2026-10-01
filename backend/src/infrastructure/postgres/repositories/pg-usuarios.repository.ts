import type {
  RefreshToken,
  RefreshTokensRepository,
  Rol,
  Usuario,
  UsuariosRepository,
} from '../../../application/ports/repositorios.js';
import type { Cliente } from '../pool.js';

interface FilaUsuario {
  id: string;
  nombre: string;
  email: string;
  hash_contrasena: string;
  roles: Rol[];
  core_cliente_id: string | null;
}

const aUsuario = (f: FilaUsuario): Usuario => ({
  id: f.id,
  nombre: f.nombre,
  email: f.email,
  hashContrasena: f.hash_contrasena,
  roles: f.roles,
  coreClienteId: f.core_cliente_id,
});

export class PgUsuariosRepository implements UsuariosRepository {
  constructor(private readonly db: Cliente) {}

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const { rows } = await this.db.query<FilaUsuario>('SELECT * FROM usuarios WHERE lower(email) = lower($1)', [email]);
    return rows[0] ? aUsuario(rows[0]) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const { rows } = await this.db.query<FilaUsuario>('SELECT * FROM usuarios WHERE id = $1', [id]);
    return rows[0] ? aUsuario(rows[0]) : null;
  }
}

export class PgRefreshTokensRepository implements RefreshTokensRepository {
  constructor(private readonly db: Cliente) {}

  async guardar(token: Omit<RefreshToken, 'revocadoEn'>): Promise<void> {
    await this.db.query('INSERT INTO refresh_tokens (hash, usuario_id, expira_en) VALUES ($1, $2, $3)', [
      token.hash,
      token.usuarioId,
      token.expiraEn,
    ]);
  }

  async buscar(hash: string): Promise<RefreshToken | null> {
    const { rows } = await this.db.query<{ hash: string; usuario_id: string; expira_en: Date; revocado_en: Date | null }>(
      'SELECT * FROM refresh_tokens WHERE hash = $1',
      [hash],
    );
    const f = rows[0];
    return f
      ? { hash: f.hash, usuarioId: f.usuario_id, expiraEn: f.expira_en.toISOString(), revocadoEn: f.revocado_en?.toISOString() ?? null }
      : null;
  }

  async revocar(hash: string, cuando: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      'UPDATE refresh_tokens SET revocado_en = $2 WHERE hash = $1 AND revocado_en IS NULL',
      [hash, cuando],
    );
    return rowCount === 1;
  }
}
