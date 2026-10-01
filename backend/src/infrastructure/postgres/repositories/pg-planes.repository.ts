import type {
  FiltroPlanes,
  OrdenPlanes,
  PlanesRepository,
  ResumenPlanes,
} from '../../../application/ports/repositorios.js';
import type { EstadoPlan, PlanAhorro } from '../../../domain/plan/plan-ahorro.js';
import { componerTasas } from '../../../domain/tarifas.js';
import type { Cliente } from '../pool.js';

interface FilaPlan {
  id: string;
  cliente_id: string;
  nombre: string;
  objetivo: string | null;
  icono: PlanAhorro['icono'];
  estado: EstadoPlan;
  moneda: 'USD';
  monto_meta_centavos: number;
  fecha_objetivo: string;
  cuota_mensual_centavos: number;
  plazo_meses: number;
  prorrogas_meses: number;
  dia_debito: number;
  cuenta_debito: PlanAhorro['cuentaDebito'];
  bloqueado: boolean;
  bloqueado_desde: Date | null;
  tasa_base_anual: number;
  bono_bloqueo_anual: number;
  fecha_inicio: string;
  fecha_fin_estimada: string;
  version: number;
  creado_en: Date;
  actualizado_en: Date;
  saldo_centavos: number;
  intereses_devengados_centavos: number;
  reservado_centavos: number;
}

const aPlan = (f: FilaPlan): PlanAhorro => ({
  id: f.id,
  clienteId: f.cliente_id,
  nombre: f.nombre,
  ...(f.objetivo !== null && { objetivo: f.objetivo }),
  icono: f.icono,
  estado: f.estado,
  moneda: f.moneda,
  montoMetaCentavos: f.monto_meta_centavos,
  fechaObjetivo: f.fecha_objetivo,
  cuotaMensualCentavos: f.cuota_mensual_centavos,
  plazoMeses: f.plazo_meses,
  prorrogasMeses: f.prorrogas_meses,
  diaDebito: f.dia_debito,
  cuentaDebito: f.cuenta_debito,
  bloqueado: f.bloqueado,
  bloqueadoDesde: f.bloqueado_desde?.toISOString() ?? null,
  tasas: componerTasas(f.tasa_base_anual, f.bono_bloqueo_anual),
  saldoCentavos: f.saldo_centavos,
  reservadoCentavos: f.reservado_centavos,
  interesesDevengadosCentavos: f.intereses_devengados_centavos,
  fechaInicio: f.fecha_inicio,
  fechaFinEstimada: f.fecha_fin_estimada,
  version: f.version,
  creadoEn: f.creado_en.toISOString(),
  actualizadoEn: f.actualizado_en.toISOString(),
});

const ORDEN_SQL: Record<OrdenPlanes, string> = {
  creadoEn: 'creado_en ASC, id ASC',
  '-creadoEn': 'creado_en DESC, id DESC',
  progreso: 'saldo_centavos::numeric / monto_meta_centavos ASC, id ASC',
  '-progreso': 'saldo_centavos::numeric / monto_meta_centavos DESC, id DESC',
  montoMetaCentavos: 'monto_meta_centavos ASC, id ASC',
  '-montoMetaCentavos': 'monto_meta_centavos DESC, id DESC',
};

function condiciones(filtro: FiltroPlanes): { where: string; valores: unknown[] } {
  const partes: string[] = [];
  const valores: unknown[] = [];
  if (filtro.clienteId) {
    valores.push(filtro.clienteId);
    partes.push(`cliente_id = $${valores.length}`);
  }
  if (filtro.estados?.length) {
    valores.push(filtro.estados);
    partes.push(`estado = ANY($${valores.length})`);
  }
  if (filtro.bloqueado !== undefined) {
    valores.push(filtro.bloqueado);
    partes.push(`bloqueado = $${valores.length}`);
  }
  return { where: partes.length ? `WHERE ${partes.join(' AND ')}` : '', valores };
}

export class PgPlanesRepository implements PlanesRepository {
  constructor(private readonly db: Cliente) {}

  async crear(plan: PlanAhorro): Promise<void> {
    await this.db.query(
      `INSERT INTO planes (id, cliente_id, nombre, objetivo, icono, estado, moneda, monto_meta_centavos, fecha_objetivo,
         cuota_mensual_centavos, plazo_meses, prorrogas_meses, dia_debito, cuenta_debito, bloqueado, bloqueado_desde,
         tasa_base_anual, bono_bloqueo_anual, fecha_inicio, fecha_fin_estimada, version, creado_en, actualizado_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
      [
        plan.id, plan.clienteId, plan.nombre, plan.objetivo ?? null, plan.icono, plan.estado, plan.moneda,
        plan.montoMetaCentavos, plan.fechaObjetivo, plan.cuotaMensualCentavos, plan.plazoMeses, plan.prorrogasMeses,
        plan.diaDebito, JSON.stringify(plan.cuentaDebito), plan.bloqueado, plan.bloqueadoDesde, plan.tasas.baseAnual,
        plan.tasas.bonoBloqueoAnual, plan.fechaInicio, plan.fechaFinEstimada, plan.version, plan.creadoEn, plan.actualizadoEn,
      ],
    );
  }

  async obtener(id: string, opciones: { paraActualizar?: boolean } = {}): Promise<PlanAhorro | null> {
    // La vista agrega saldos y no admite FOR UPDATE: el bloqueo se toma sobre la tabla.
    if (opciones.paraActualizar) {
      await this.db.query('SELECT 1 FROM planes WHERE id = $1 FOR UPDATE', [id]);
    }
    const { rows } = await this.db.query<FilaPlan>('SELECT * FROM vw_planes WHERE id = $1', [id]);
    return rows[0] ? aPlan(rows[0]) : null;
  }

  async actualizar(plan: PlanAhorro): Promise<PlanAhorro> {
    await this.db.query(
      `UPDATE planes SET nombre = $2, objetivo = $3, icono = $4, estado = $5, plazo_meses = $6, prorrogas_meses = $7,
         dia_debito = $8, bloqueado = $9, bloqueado_desde = $10, tasa_base_anual = $11, bono_bloqueo_anual = $12,
         fecha_fin_estimada = $13, actualizado_en = $14, version = version + 1
       WHERE id = $1`,
      [
        plan.id, plan.nombre, plan.objetivo ?? null, plan.icono, plan.estado, plan.plazoMeses, plan.prorrogasMeses,
        plan.diaDebito, plan.bloqueado, plan.bloqueadoDesde, plan.tasas.baseAnual, plan.tasas.bonoBloqueoAnual,
        plan.fechaFinEstimada, plan.actualizadoEn,
      ],
    );
    return (await this.obtener(plan.id)) as PlanAhorro;
  }

  async listar(filtro: FiltroPlanes, orden: OrdenPlanes, pagina: number, limite: number): Promise<{ items: PlanAhorro[]; total: number }> {
    const { where, valores } = condiciones(filtro);
    const [filas, conteo] = await Promise.all([
      this.db.query<FilaPlan>(
        `SELECT * FROM vw_planes ${where} ORDER BY ${ORDEN_SQL[orden]} LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
        [...valores, limite, (pagina - 1) * limite],
      ),
      this.db.query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM planes ${where}`, valores),
    ]);
    return { items: filas.rows.map(aPlan), total: conteo.rows[0]?.total ?? 0 };
  }

  async resumen(filtro: FiltroPlanes): Promise<ResumenPlanes> {
    const { where, valores } = condiciones(filtro);
    const { rows } = await this.db.query<{ ahorrado: number; meta: number; cantidad: number; activos: number }>(
      `SELECT COALESCE(SUM(saldo_centavos), 0)::bigint AS ahorrado,
              COALESCE(SUM(monto_meta_centavos), 0)::bigint AS meta,
              COUNT(*)::int AS cantidad,
              COUNT(*) FILTER (WHERE estado = 'ACTIVO')::int AS activos
       FROM vw_planes ${where}`,
      valores,
    );
    const fila = rows[0];
    return {
      moneda: 'USD',
      totalAhorradoCentavos: fila?.ahorrado ?? 0,
      totalMetaCentavos: fila?.meta ?? 0,
      cantidadPlanes: fila?.cantidad ?? 0,
      planesActivos: fila?.activos ?? 0,
    };
  }
}
