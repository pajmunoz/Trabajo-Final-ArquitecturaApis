import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

// bigint (int8) llega como string por defecto; los montos en centavos caben en Number.
pg.types.setTypeParser(20, (valor) => Number(valor));
// numeric (tasas) como número.
pg.types.setTypeParser(1700, (valor) => Number(valor));
// date como 'YYYY-MM-DD' sin convertir a Date (evita corrimientos de zona horaria).
pg.types.setTypeParser(1082, (valor) => valor);

export type Pool = pg.Pool;
export type Cliente = pg.PoolClient | pg.Pool;

export function crearPool(connectionString: string, max = 20): pg.Pool {
  return new pg.Pool({ connectionString, max, idleTimeoutMillis: 30_000 });
}

/** Aplica en orden los archivos .sql de db/migrations (son idempotentes). */
export async function migrar(pool: pg.Pool, directorio = join(process.cwd(), 'db', 'migrations')): Promise<string[]> {
  const archivos = (await readdir(directorio)).filter((a) => a.endsWith('.sql')).sort();
  const cliente = await pool.connect();
  try {
    // Serializa migraciones cuando varios procesos arrancan a la vez.
    await cliente.query('SELECT pg_advisory_lock(727272)');
    for (const archivo of archivos) {
      await cliente.query(await readFile(join(directorio, archivo), 'utf8'));
    }
  } finally {
    await cliente.query('SELECT pg_advisory_unlock(727272)').catch(() => undefined);
    cliente.release();
  }
  return archivos;
}
