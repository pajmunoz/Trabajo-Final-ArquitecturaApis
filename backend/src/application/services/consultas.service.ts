import type { Cuota, EstadoCuota } from '../../domain/cuota/cuota.js';
import { noEncontrado } from '../../domain/errors.js';
import type { Movimiento, TipoMovimiento } from '../../domain/operaciones.js';
import {
  codificarCursor,
  decodificarCursor,
  paginaOffset,
  type PaginaCursor,
  type PaginaOffset,
} from '../../shared/paginacion.js';
import type { CorridaCobro, UnitOfWork } from '../ports/repositorios.js';
import { obtenerPlanAccesible, type Actor } from './comunes.js';

export interface FiltroMovimientosInput {
  tipos?: TipoMovimiento[];
  desde?: string;
  hasta?: string;
  cursor?: string;
  limite: number;
}

/** Lecturas: calendario de cuotas, ledger (cursor) y corridas del batch. */
export class ConsultasService {
  constructor(private readonly uow: UnitOfWork) {}

  async cuotas(actor: Actor, planId: string, estados: EstadoCuota[] | undefined, pagina: number, limite: number): Promise<PaginaOffset<Cuota>> {
    await obtenerPlanAccesible(this.uow.repos, actor, planId);
    const { items, total } = await this.uow.repos.cuotas.listarPorPlan(planId, estados, pagina, limite);
    return paginaOffset(items, pagina, limite, total);
  }

  /**
   * Paginación por cursor: se pide un elemento de más para saber si hay otra página.
   * El cursor apunta al último entregado, así los asientos nuevos no desplazan los resultados.
   */
  async movimientos(actor: Actor, planId: string, filtro: FiltroMovimientosInput): Promise<PaginaCursor<Movimiento>> {
    await obtenerPlanAccesible(this.uow.repos, actor, planId);
    const filas = await this.uow.repos.movimientos.listar(planId, {
      tipos: filtro.tipos,
      desde: filtro.desde,
      hasta: filtro.hasta,
      despuesDe: filtro.cursor ? decodificarCursor(filtro.cursor) : undefined,
      limite: filtro.limite + 1,
    });
    const hayMas = filas.length > filtro.limite;
    const items = filas.slice(0, filtro.limite);
    const ultimo = items[items.length - 1];
    return {
      items,
      hayMas,
      siguienteCursor: hayMas && ultimo ? codificarCursor({ fecha: ultimo.fecha, id: ultimo.id }) : null,
    };
  }

  async corridas(
    filtro: { desde?: string; hasta?: string; estado?: CorridaCobro['estado'] },
    pagina: number,
    limite: number,
  ): Promise<PaginaOffset<CorridaCobro>> {
    const { items, total } = await this.uow.repos.corridas.listar(filtro, pagina, limite);
    return paginaOffset(items, pagina, limite, total);
  }

  async corrida(id: string): Promise<CorridaCobro> {
    const corrida = await this.uow.repos.corridas.obtener(id);
    if (!corrida) throw noEncontrado('la corrida', id);
    return corrida;
  }
}
