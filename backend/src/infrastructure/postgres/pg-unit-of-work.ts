import type { Repositorios, UnitOfWork } from '../../application/ports/repositorios.js';
import type { Cliente, Pool } from './pool.js';
import { PgCorridasRepository, PgCuotasRepository, PgOperacionesRepository } from './repositories/pg-cobros.repository.js';
import {
  PgEventosProcesadosRepository,
  PgIdempotenciaRepository,
  PgMovimientosRepository,
  PgOutboxRepository,
} from './repositories/pg-ledger.repository.js';
import { PgPlanesRepository } from './repositories/pg-planes.repository.js';
import { PgRefreshTokensRepository, PgUsuariosRepository } from './repositories/pg-usuarios.repository.js';

function repositoriosSobre(db: Cliente): Repositorios {
  return {
    usuarios: new PgUsuariosRepository(db),
    refreshTokens: new PgRefreshTokensRepository(db),
    planes: new PgPlanesRepository(db),
    cuotas: new PgCuotasRepository(db),
    operaciones: new PgOperacionesRepository(db),
    movimientos: new PgMovimientosRepository(db),
    outbox: new PgOutboxRepository(db),
    corridas: new PgCorridasRepository(db),
    eventosProcesados: new PgEventosProcesadosRepository(db),
    idempotencia: new PgIdempotenciaRepository(db),
  };
}

/** Unidad de trabajo sobre una transacción de PostgreSQL (BEGIN / COMMIT / ROLLBACK). */
export class PgUnitOfWork implements UnitOfWork {
  readonly repos: Repositorios;

  constructor(private readonly pool: Pool) {
    this.repos = repositoriosSobre(pool);
  }

  async ejecutar<T>(trabajo: (repos: Repositorios) => Promise<T>): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await trabajo(repositoriosSobre(cliente));
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      await cliente.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      cliente.release();
    }
  }
}
