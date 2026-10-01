import type {
  EventosProcesadosRepository,
  FiltroMovimientos,
  IdempotenciaRepository,
  MovimientosRepository,
  OutboxRepository,
  RespuestaGuardada,
} from '../../../application/ports/repositorios.js';
import type { Evento } from '../../../domain/eventos.js';
import type { Movimiento } from '../../../domain/operaciones.js';
import type { Cliente } from '../pool.js';

interface FilaMovimiento {
  id: string;
  plan_id: string;
  tipo: Movimiento['tipo'];
  monto_centavos: number;
  moneda: 'USD';
  saldo_resultante_centavos: number;
  fecha: Date;
  descripcion: string;
  origen: string;
  referencia_tipo: NonNullable<Movimiento['referencia']>['tipo'] | null;
  referencia_id: string | null;
  correlation_id: string | null;
}

const aMovimiento = (f: FilaMovimiento): Movimiento => ({
  id: f.id,
  planId: f.plan_id,
  tipo: f.tipo,
  montoCentavos: f.monto_centavos,
  moneda: f.moneda,
  saldoResultanteCentavos: f.saldo_resultante_centavos,
  fecha: f.fecha.toISOString(),
  descripcion: f.descripcion,
  origen: f.origen,
  referencia: f.referencia_tipo && f.referencia_id ? { tipo: f.referencia_tipo, id: f.referencia_id } : null,
  correlationId: f.correlation_id,
});

/** Ledger de solo inserción: el trigger de la base rechaza UPDATE y DELETE. */
export class PgMovimientosRepository implements MovimientosRepository {
  constructor(private readonly db: Cliente) {}

  async asentar(m: Omit<Movimiento, 'saldoResultanteCentavos'>): Promise<Movimiento> {
    // El saldo resultante sale del propio ledger. El servicio ya tomó el bloqueo del plan.
    const { rows } = await this.db.query<FilaMovimiento>(
      `INSERT INTO movimientos (id, plan_id, tipo, monto_centavos, moneda, saldo_resultante_centavos, fecha, descripcion, origen,
         referencia_tipo, referencia_id, correlation_id)
       SELECT $1, $2, $3, $4::bigint, $5, COALESCE((SELECT SUM(monto_centavos) FROM movimientos WHERE plan_id = $2), 0) + $4::bigint,
              $6, $7, $8, $9, $10, $11
       RETURNING *`,
      [m.id, m.planId, m.tipo, m.montoCentavos, m.moneda, m.fecha, m.descripcion, m.origen, m.referencia?.tipo ?? null,
        m.referencia?.id ?? null, m.correlationId],
    );
    return aMovimiento(rows[0] as FilaMovimiento);
  }

  async listar(planId: string, filtro: FiltroMovimientos): Promise<Movimiento[]> {
    const partes = ['plan_id = $1'];
    const valores: unknown[] = [planId];
    const agregar = (condicion: (n: number) => string, valor: unknown) => {
      valores.push(valor);
      partes.push(condicion(valores.length));
    };
    if (filtro.tipos?.length) agregar((n) => `tipo = ANY($${n})`, filtro.tipos);
    if (filtro.desde) agregar((n) => `fecha >= $${n}::date`, filtro.desde);
    if (filtro.hasta) agregar((n) => `fecha < ($${n}::date + 1)`, filtro.hasta);
    if (filtro.despuesDe) {
      valores.push(filtro.despuesDe.fecha, filtro.despuesDe.id);
      partes.push(`(fecha, id) < ($${valores.length - 1}::timestamptz, $${valores.length}::uuid)`);
    }
    valores.push(filtro.limite);
    const { rows } = await this.db.query<FilaMovimiento>(
      `SELECT * FROM movimientos WHERE ${partes.join(' AND ')} ORDER BY fecha DESC, id DESC LIMIT $${valores.length}`,
      valores,
    );
    return rows.map(aMovimiento);
  }
}

export class PgOutboxRepository implements OutboxRepository {
  constructor(private readonly db: Cliente) {}

  async agregar(evento: Evento): Promise<void> {
    await this.db.query('INSERT INTO outbox (id, tipo, correlation_id, payload) VALUES ($1, $2, $3, $4)', [
      evento.id,
      evento.tipo,
      evento.correlationId,
      JSON.stringify(evento),
    ]);
  }
}

export class PgEventosProcesadosRepository implements EventosProcesadosRepository {
  constructor(private readonly db: Cliente) {}

  async registrarSiNuevo(eventoId: string, consumidor: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      'INSERT INTO eventos_procesados (evento_id, consumidor) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [eventoId, consumidor],
    );
    return rowCount === 1;
  }
}

export class PgIdempotenciaRepository implements IdempotenciaRepository {
  constructor(private readonly db: Cliente) {}

  async buscar(clave: string, usuarioId: string, operacion: string): Promise<RespuestaGuardada | null> {
    const { rows } = await this.db.query<{
      clave: string;
      usuario_id: string;
      operacion: string;
      hash_cuerpo: string;
      status: number;
      cuerpo: unknown;
      headers: Record<string, string>;
    }>(
      `SELECT * FROM idempotencia
       WHERE clave = $1 AND usuario_id = $2 AND operacion = $3 AND creado_en > now() - interval '24 hours'`,
      [clave, usuarioId, operacion],
    );
    const fila = rows[0];
    return fila
      ? { clave: fila.clave, usuarioId: fila.usuario_id, operacion: fila.operacion, hashCuerpo: fila.hash_cuerpo, status: fila.status, cuerpo: fila.cuerpo, headers: fila.headers }
      : null;
  }

  async guardar(r: RespuestaGuardada): Promise<void> {
    await this.db.query(
      `INSERT INTO idempotencia (clave, usuario_id, operacion, hash_cuerpo, status, cuerpo, headers)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (clave, usuario_id, operacion) DO UPDATE
         SET hash_cuerpo = EXCLUDED.hash_cuerpo, status = EXCLUDED.status, cuerpo = EXCLUDED.cuerpo,
             headers = EXCLUDED.headers, creado_en = now()`,
      [r.clave, r.usuarioId, r.operacion, r.hashCuerpo, r.status, JSON.stringify(r.cuerpo ?? null), JSON.stringify(r.headers)],
    );
  }
}
