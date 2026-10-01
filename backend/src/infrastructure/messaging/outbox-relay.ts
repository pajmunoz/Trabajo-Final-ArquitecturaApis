import type { Evento } from '../../domain/eventos.js';
import type { Logger } from '../../shared/logger.js';
import type { Pool } from '../postgres/pool.js';

export interface Publicador {
  publicar(evento: Evento): Promise<void>;
}

/**
 * Relay del Transactional Outbox: toma los eventos guardados por las transacciones
 * de negocio y los publica en RabbitMQ después del commit. FOR UPDATE SKIP LOCKED
 * permite correr varias instancias sin publicar dos veces el mismo lote; si el
 * broker falla, el evento sigue pendiente y se reintenta en la siguiente vuelta.
 */
export class OutboxRelay {
  private temporizador?: NodeJS.Timeout;
  private ocupado = false;

  constructor(
    private readonly pool: Pool,
    private readonly publicador: Publicador,
    private readonly logger: Logger,
    private readonly lote = 100,
  ) {}

  iniciar(intervaloMs: number): void {
    this.temporizador = setInterval(() => void this.publicarPendientes(), intervaloMs);
  }

  detener(): void {
    clearInterval(this.temporizador);
  }

  async publicarPendientes(): Promise<number> {
    if (this.ocupado) return 0;
    this.ocupado = true;
    const cliente = await this.pool.connect();
    let publicados = 0;
    try {
      await cliente.query('BEGIN');
      const { rows } = await cliente.query<{ id: string; payload: Evento }>(
        `SELECT id, payload FROM outbox WHERE publicado_en IS NULL
         ORDER BY creado_en LIMIT $1 FOR UPDATE SKIP LOCKED`,
        [this.lote],
      );
      for (const fila of rows) {
        try {
          await this.publicador.publicar(fila.payload);
          await cliente.query('UPDATE outbox SET publicado_en = now(), intentos = intentos + 1 WHERE id = $1', [fila.id]);
          publicados++;
        } catch (error) {
          await cliente.query('UPDATE outbox SET intentos = intentos + 1 WHERE id = $1', [fila.id]);
          this.logger.warn({ err: error, eventoId: fila.id }, 'No se pudo publicar el evento; queda pendiente');
          break;
        }
      }
      await cliente.query('COMMIT');
    } catch (error) {
      await cliente.query('ROLLBACK').catch(() => undefined);
      this.logger.error({ err: error }, 'Error en el relay de la outbox');
    } finally {
      cliente.release();
      this.ocupado = false;
    }
    return publicados;
  }
}
