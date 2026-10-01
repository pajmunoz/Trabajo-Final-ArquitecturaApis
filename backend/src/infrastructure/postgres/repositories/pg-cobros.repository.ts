import type {
  ContadorCorrida,
  CorridaCobro,
  CorridasRepository,
  CuotasRepository,
  OperacionesRepository,
} from '../../../application/ports/repositorios.js';
import type { Cuota, EstadoCuota } from '../../../domain/cuota/cuota.js';
import type { OperacionCore, TipoOperacion } from '../../../domain/operaciones.js';
import type { Cliente } from '../pool.js';

const iso = (fecha: Date | null) => fecha?.toISOString() ?? null;

// ---------------------------------------------------------------------------
// Cuotas
// ---------------------------------------------------------------------------
interface FilaCuota {
  id: string;
  plan_id: string;
  numero: number;
  fecha_programada: string;
  monto_centavos: number;
  estado: EstadoCuota;
  intentos: number;
  proximo_intento: Date | null;
  ejecutada_en: Date | null;
}

const aCuota = (f: FilaCuota): Cuota => ({
  id: f.id,
  planId: f.plan_id,
  numero: f.numero,
  fechaProgramada: f.fecha_programada,
  montoCentavos: f.monto_centavos,
  estado: f.estado,
  intentos: f.intentos,
  proximoIntento: iso(f.proximo_intento),
  ejecutadaEn: iso(f.ejecutada_en),
});

export class PgCuotasRepository implements CuotasRepository {
  constructor(private readonly db: Cliente) {}

  async crearVarias(cuotas: Cuota[]): Promise<void> {
    if (cuotas.length === 0) return;
    const valores: unknown[] = [];
    const filas = cuotas.map((c, i) => {
      valores.push(c.id, c.planId, c.numero, c.fechaProgramada, c.montoCentavos, c.estado, c.intentos, c.proximoIntento, c.ejecutadaEn);
      const b = i * 9;
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9})`;
    });
    await this.db.query(
      `INSERT INTO cuotas (id, plan_id, numero, fecha_programada, monto_centavos, estado, intentos, proximo_intento, ejecutada_en)
       VALUES ${filas.join(',')}`,
      valores,
    );
  }

  async obtener(id: string, opciones: { paraActualizar?: boolean } = {}): Promise<Cuota | null> {
    const { rows } = await this.db.query<FilaCuota>(
      `SELECT * FROM cuotas WHERE id = $1${opciones.paraActualizar ? ' FOR UPDATE' : ''}`,
      [id],
    );
    return rows[0] ? aCuota(rows[0]) : null;
  }

  async actualizar(c: Cuota): Promise<void> {
    await this.db.query(
      `UPDATE cuotas SET fecha_programada = $2, monto_centavos = $3, estado = $4, intentos = $5, proximo_intento = $6, ejecutada_en = $7
       WHERE id = $1`,
      [c.id, c.fechaProgramada, c.montoCentavos, c.estado, c.intentos, c.proximoIntento, c.ejecutadaEn],
    );
  }

  async listarPorPlan(planId: string, estados: EstadoCuota[] | undefined, pagina: number, limite: number): Promise<{ items: Cuota[]; total: number }> {
    const filtro = estados?.length ? 'AND estado = ANY($2)' : '';
    const valores: unknown[] = estados?.length ? [planId, estados] : [planId];
    const [filas, conteo] = await Promise.all([
      this.db.query<FilaCuota>(
        `SELECT * FROM cuotas WHERE plan_id = $1 ${filtro} ORDER BY numero LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
        [...valores, limite, (pagina - 1) * limite],
      ),
      this.db.query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM cuotas WHERE plan_id = $1 ${filtro}`, valores),
    ]);
    return { items: filas.rows.map(aCuota), total: conteo.rows[0]?.total ?? 0 };
  }

  async ultimaDelPlan(planId: string): Promise<Cuota | null> {
    const { rows } = await this.db.query<FilaCuota>('SELECT * FROM cuotas WHERE plan_id = $1 ORDER BY numero DESC LIMIT 1', [planId]);
    return rows[0] ? aCuota(rows[0]) : null;
  }

  async cancelarProgramadas(planId: string): Promise<number> {
    const { rowCount } = await this.db.query(
      `UPDATE cuotas SET estado = 'CANCELADA', proximo_intento = NULL
       WHERE plan_id = $1 AND (estado = 'PROGRAMADA' OR (estado = 'PENDIENTE' AND proximo_intento IS NOT NULL))`,
      [planId],
    );
    return rowCount ?? 0;
  }

  async seleccionarDebitosDelDia(fecha: string, ahora: string): Promise<Cuota[]> {
    const { rows } = await this.db.query<FilaCuota>('SELECT * FROM sp_procesar_debitos_ahorro_programado($1, $2)', [fecha, ahora]);
    return rows.map(aCuota);
  }
}

// ---------------------------------------------------------------------------
// Operaciones con el Core
// ---------------------------------------------------------------------------
interface FilaOperacion {
  id: string;
  plan_id: string;
  tipo: TipoOperacion;
  monto_centavos: number;
  moneda: 'USD';
  cuenta: OperacionCore['cuenta'];
  estado: OperacionCore['estado'];
  motivo_fallo: OperacionCore['motivoFallo'];
  cuota_id: string | null;
  corrida_id: string | null;
  correlation_id: string;
  solicitado_en: Date;
  procesado_en: Date | null;
}

const aOperacion = (f: FilaOperacion): OperacionCore => ({
  id: f.id,
  planId: f.plan_id,
  tipo: f.tipo,
  montoCentavos: f.monto_centavos,
  moneda: f.moneda,
  cuenta: f.cuenta,
  estado: f.estado,
  motivoFallo: f.motivo_fallo,
  cuotaId: f.cuota_id,
  corridaId: f.corrida_id,
  correlationId: f.correlation_id,
  solicitadoEn: f.solicitado_en.toISOString(),
  procesadoEn: iso(f.procesado_en),
});

export class PgOperacionesRepository implements OperacionesRepository {
  constructor(private readonly db: Cliente) {}

  async crear(o: OperacionCore): Promise<void> {
    await this.db.query(
      `INSERT INTO operaciones_core (id, plan_id, tipo, monto_centavos, moneda, cuenta, estado, motivo_fallo, cuota_id, corrida_id,
         correlation_id, solicitado_en, procesado_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [o.id, o.planId, o.tipo, o.montoCentavos, o.moneda, JSON.stringify(o.cuenta), o.estado, o.motivoFallo, o.cuotaId, o.corridaId,
        o.correlationId, o.solicitadoEn, o.procesadoEn],
    );
  }

  async obtener(id: string, opciones: { paraActualizar?: boolean } = {}): Promise<OperacionCore | null> {
    const { rows } = await this.db.query<FilaOperacion>(
      `SELECT * FROM operaciones_core WHERE id = $1${opciones.paraActualizar ? ' FOR UPDATE' : ''}`,
      [id],
    );
    return rows[0] ? aOperacion(rows[0]) : null;
  }

  async obtenerDelPlan(planId: string, id: string, tipos: TipoOperacion[]): Promise<OperacionCore | null> {
    const { rows } = await this.db.query<FilaOperacion>(
      'SELECT * FROM operaciones_core WHERE id = $1 AND plan_id = $2 AND tipo = ANY($3)',
      [id, planId, tipos],
    );
    return rows[0] ? aOperacion(rows[0]) : null;
  }

  async actualizar(o: OperacionCore): Promise<void> {
    await this.db.query(
      'UPDATE operaciones_core SET estado = $2, motivo_fallo = $3, procesado_en = $4 WHERE id = $1',
      [o.id, o.estado, o.motivoFallo, o.procesadoEn],
    );
  }
}

// ---------------------------------------------------------------------------
// Corridas del corte diario
// ---------------------------------------------------------------------------
interface FilaCorrida {
  id: string;
  fecha_corte: string;
  estado: CorridaCobro['estado'];
  iniciada_en: Date;
  finalizada_en: Date | null;
  total_cuotas: number;
  ejecutadas: number;
  rechazadas: number;
  reprogramadas: number;
  canceladas: number;
  errores_tecnicos: number;
}

const aCorrida = (f: FilaCorrida): CorridaCobro => ({
  id: f.id,
  fechaCorte: f.fecha_corte,
  estado: f.estado,
  iniciadaEn: f.iniciada_en.toISOString(),
  finalizadaEn: iso(f.finalizada_en),
  totalCuotas: f.total_cuotas,
  ejecutadas: f.ejecutadas,
  rechazadas: f.rechazadas,
  reprogramadas: f.reprogramadas,
  canceladas: f.canceladas,
  erroresTecnicos: f.errores_tecnicos,
});

const COLUMNA_CONTADOR: Record<ContadorCorrida, string> = {
  ejecutadas: 'ejecutadas',
  rechazadas: 'rechazadas',
  reprogramadas: 'reprogramadas',
  canceladas: 'canceladas',
  erroresTecnicos: 'errores_tecnicos',
};

export class PgCorridasRepository implements CorridasRepository {
  constructor(private readonly db: Cliente) {}

  async crear(c: CorridaCobro): Promise<void> {
    await this.db.query(
      `INSERT INTO corridas_cobro (id, fecha_corte, estado, iniciada_en, finalizada_en, total_cuotas, ejecutadas, rechazadas,
         reprogramadas, canceladas, errores_tecnicos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [c.id, c.fechaCorte, c.estado, c.iniciadaEn, c.finalizadaEn, c.totalCuotas, c.ejecutadas, c.rechazadas, c.reprogramadas,
        c.canceladas, c.erroresTecnicos],
    );
  }

  async obtener(id: string): Promise<CorridaCobro | null> {
    const { rows } = await this.db.query<FilaCorrida>('SELECT * FROM corridas_cobro WHERE id = $1', [id]);
    return rows[0] ? aCorrida(rows[0]) : null;
  }

  async actualizar(c: CorridaCobro): Promise<void> {
    await this.db.query(
      'UPDATE corridas_cobro SET estado = $2, finalizada_en = $3, total_cuotas = $4 WHERE id = $1',
      [c.id, c.estado, c.finalizadaEn, c.totalCuotas],
    );
  }

  async incrementar(id: string, contador: ContadorCorrida): Promise<void> {
    const columna = COLUMNA_CONTADOR[contador];
    await this.db.query(`UPDATE corridas_cobro SET ${columna} = ${columna} + 1 WHERE id = $1`, [id]);
  }

  async listar(
    filtro: { desde?: string; hasta?: string; estado?: CorridaCobro['estado'] },
    pagina: number,
    limite: number,
  ): Promise<{ items: CorridaCobro[]; total: number }> {
    const partes: string[] = [];
    const valores: unknown[] = [];
    if (filtro.desde) {
      valores.push(filtro.desde);
      partes.push(`fecha_corte >= $${valores.length}`);
    }
    if (filtro.hasta) {
      valores.push(filtro.hasta);
      partes.push(`fecha_corte <= $${valores.length}`);
    }
    if (filtro.estado) {
      valores.push(filtro.estado);
      partes.push(`estado = $${valores.length}`);
    }
    const where = partes.length ? `WHERE ${partes.join(' AND ')}` : '';
    const [filas, conteo] = await Promise.all([
      this.db.query<FilaCorrida>(
        `SELECT * FROM corridas_cobro ${where} ORDER BY iniciada_en DESC LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
        [...valores, limite, (pagina - 1) * limite],
      ),
      this.db.query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM corridas_cobro ${where}`, valores),
    ]);
    return { items: filas.rows.map(aCorrida), total: conteo.rows[0]?.total ?? 0 };
  }
}
