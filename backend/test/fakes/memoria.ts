import type {
  ContadorCorrida,
  CorridaCobro,
  FiltroPlanes,
  OrdenPlanes,
  RefreshToken,
  Repositorios,
  RespuestaGuardada,
  UnitOfWork,
  Usuario,
} from '../../src/application/ports/repositorios.js';
import type { GeneradorId, Reloj } from '../../src/application/ports/servicios.js';
import type { Cuota } from '../../src/domain/cuota/cuota.js';
import type { Evento } from '../../src/domain/eventos.js';
import type { Movimiento, OperacionCore } from '../../src/domain/operaciones.js';
import type { PlanAhorro } from '../../src/domain/plan/plan-ahorro.js';

/**
 * Repositorios en memoria con la misma semántica que los de PostgreSQL
 * (saldos derivados del ledger, reservado por retiros pendientes). La unidad de
 * trabajo hace una copia y la restaura si el trabajo falla (rollback).
 */
export class BaseEnMemoria {
  usuarios: Usuario[] = [];
  refreshTokens: RefreshToken[] = [];
  planes: PlanAhorro[] = [];
  cuotas: Cuota[] = [];
  operaciones: OperacionCore[] = [];
  movimientos: Movimiento[] = [];
  outbox: Evento[] = [];
  corridas: CorridaCobro[] = [];
  eventosProcesados = new Set<string>();
  idempotencia: RespuestaGuardada[] = [];
}

const copiar = <T>(v: T): T => structuredClone(v);

function derivar(base: BaseEnMemoria, plan: PlanAhorro): PlanAhorro {
  const movs = base.movimientos.filter((m) => m.planId === plan.id);
  return {
    ...copiar(plan),
    saldoCentavos: movs.reduce((a, m) => a + m.montoCentavos, 0),
    interesesDevengadosCentavos: movs.filter((m) => m.tipo === 'INTERES' || m.tipo === 'PENALIDAD').reduce((a, m) => a + m.montoCentavos, 0),
    reservadoCentavos: base.operaciones
      .filter((o) => o.planId === plan.id && o.estado === 'PENDIENTE' && (o.tipo === 'RETIRO' || o.tipo === 'DEVOLUCION'))
      .reduce((a, o) => a + o.montoCentavos, 0),
  };
}

function filtrar(base: BaseEnMemoria, f: FiltroPlanes) {
  return base.planes
    .filter((p) => (!f.clienteId || p.clienteId === f.clienteId) && (!f.estados?.length || f.estados.includes(p.estado)) && (f.bloqueado === undefined || p.bloqueado === f.bloqueado))
    .map((p) => derivar(base, p));
}

function paginar<T>(items: T[], pagina: number, limite: number) {
  return { items: items.slice((pagina - 1) * limite, pagina * limite), total: items.length };
}

export function repositoriosEnMemoria(base: BaseEnMemoria): Repositorios {
  return {
    usuarios: {
      buscarPorEmail: async (email) => copiar(base.usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null),
      buscarPorId: async (id) => copiar(base.usuarios.find((u) => u.id === id) ?? null),
    },
    refreshTokens: {
      guardar: async (t) => void base.refreshTokens.push({ ...t, revocadoEn: null }),
      buscar: async (hash) => copiar(base.refreshTokens.find((t) => t.hash === hash) ?? null),
      revocar: async (hash, cuando) => {
        const t = base.refreshTokens.find((x) => x.hash === hash && !x.revocadoEn);
        if (!t) return false;
        t.revocadoEn = cuando;
        return true;
      },
    },
    planes: {
      crear: async (plan) => void base.planes.push(copiar(plan)),
      obtener: async (id) => {
        const plan = base.planes.find((p) => p.id === id);
        return plan ? derivar(base, plan) : null;
      },
      actualizar: async (plan) => {
        const i = base.planes.findIndex((p) => p.id === plan.id);
        base.planes[i] = { ...copiar(plan), version: (base.planes[i]?.version ?? 0) + 1 };
        return derivar(base, base.planes[i] as PlanAhorro);
      },
      listar: async (filtro: FiltroPlanes, orden: OrdenPlanes, pagina, limite) => {
        const items = filtrar(base, filtro);
        const campo = orden.replace('-', '') as 'creadoEn' | 'progreso' | 'montoMetaCentavos';
        const valor = (p: PlanAhorro) => (campo === 'progreso' ? p.saldoCentavos / p.montoMetaCentavos : campo === 'creadoEn' ? p.creadoEn : p.montoMetaCentavos);
        items.sort((a, b) => (valor(a) < valor(b) ? -1 : valor(a) > valor(b) ? 1 : 0) * (orden.startsWith('-') ? -1 : 1));
        return paginar(items, pagina, limite);
      },
      resumen: async (filtro) => {
        const items = filtrar(base, filtro);
        return {
          moneda: 'USD',
          totalAhorradoCentavos: items.reduce((a, p) => a + p.saldoCentavos, 0),
          totalMetaCentavos: items.reduce((a, p) => a + p.montoMetaCentavos, 0),
          cantidadPlanes: items.length,
          planesActivos: items.filter((p) => p.estado === 'ACTIVO').length,
        };
      },
    },
    cuotas: {
      crearVarias: async (cuotas) => void base.cuotas.push(...copiar(cuotas)),
      obtener: async (id) => copiar(base.cuotas.find((c) => c.id === id) ?? null),
      actualizar: async (cuota) => {
        const i = base.cuotas.findIndex((c) => c.id === cuota.id);
        base.cuotas[i] = copiar(cuota);
      },
      listarPorPlan: async (planId, estados, pagina, limite) =>
        paginar(copiar(base.cuotas.filter((c) => c.planId === planId && (!estados?.length || estados.includes(c.estado))).sort((a, b) => a.numero - b.numero)), pagina, limite),
      ultimaDelPlan: async (planId) => copiar(base.cuotas.filter((c) => c.planId === planId).sort((a, b) => b.numero - a.numero)[0] ?? null),
      cancelarProgramadas: async (planId) => {
        const afectadas = base.cuotas.filter((c) => c.planId === planId && (c.estado === 'PROGRAMADA' || (c.estado === 'PENDIENTE' && c.proximoIntento)));
        for (const c of afectadas) {
          c.estado = 'CANCELADA';
          c.proximoIntento = null;
        }
        return afectadas.length;
      },
      seleccionarDebitosDelDia: async (fecha, ahora) =>
        copiar(
          base.cuotas.filter((c) => {
            const plan = base.planes.find((p) => p.id === c.planId);
            if (plan?.estado !== 'ACTIVO') return false;
            return (c.estado === 'PROGRAMADA' && c.fechaProgramada <= fecha) || (c.estado === 'PENDIENTE' && c.proximoIntento !== null && c.proximoIntento <= ahora);
          }),
        ),
    },
    operaciones: {
      crear: async (o) => void base.operaciones.push(copiar(o)),
      obtener: async (id) => copiar(base.operaciones.find((o) => o.id === id) ?? null),
      obtenerDelPlan: async (planId, id, tipos) => copiar(base.operaciones.find((o) => o.id === id && o.planId === planId && tipos.includes(o.tipo)) ?? null),
      actualizar: async (o) => {
        const i = base.operaciones.findIndex((x) => x.id === o.id);
        base.operaciones[i] = copiar(o);
      },
    },
    movimientos: {
      asentar: async (m) => {
        const saldo = base.movimientos.filter((x) => x.planId === m.planId).reduce((a, x) => a + x.montoCentavos, 0);
        const movimiento = { ...copiar(m), saldoResultanteCentavos: saldo + m.montoCentavos };
        base.movimientos.push(movimiento);
        return copiar(movimiento);
      },
      listar: async (planId, f) =>
        copiar(
          base.movimientos
            .filter((m) => m.planId === planId)
            .filter((m) => (!f.tipos?.length || f.tipos.includes(m.tipo)) && (!f.desde || m.fecha.slice(0, 10) >= f.desde) && (!f.hasta || m.fecha.slice(0, 10) <= f.hasta))
            .sort((a, b) => (a.fecha === b.fecha ? b.id.localeCompare(a.id) : b.fecha.localeCompare(a.fecha)))
            .filter((m) => !f.despuesDe || m.fecha < f.despuesDe.fecha || (m.fecha === f.despuesDe.fecha && m.id < f.despuesDe.id))
            .slice(0, f.limite),
        ),
    },
    outbox: { agregar: async (e) => void base.outbox.push(copiar(e)) },
    corridas: {
      crear: async (c) => void base.corridas.push(copiar(c)),
      obtener: async (id) => copiar(base.corridas.find((c) => c.id === id) ?? null),
      actualizar: async (c) => {
        const i = base.corridas.findIndex((x) => x.id === c.id);
        base.corridas[i] = copiar(c);
      },
      incrementar: async (id, contador: ContadorCorrida) => {
        const c = base.corridas.find((x) => x.id === id);
        if (c) c[contador]++;
      },
      listar: async (f, pagina, limite) =>
        paginar(copiar(base.corridas.filter((c) => (!f.desde || c.fechaCorte >= f.desde) && (!f.hasta || c.fechaCorte <= f.hasta) && (!f.estado || c.estado === f.estado))), pagina, limite),
    },
    eventosProcesados: {
      registrarSiNuevo: async (eventoId, consumidor) => {
        const clave = `${eventoId}|${consumidor}`;
        if (base.eventosProcesados.has(clave)) return false;
        base.eventosProcesados.add(clave);
        return true;
      },
    },
    idempotencia: {
      buscar: async (clave, usuarioId, operacion) => copiar(base.idempotencia.find((r) => r.clave === clave && r.usuarioId === usuarioId && r.operacion === operacion) ?? null),
      guardar: async (r) => {
        base.idempotencia = base.idempotencia.filter((x) => !(x.clave === r.clave && x.usuarioId === r.usuarioId && x.operacion === r.operacion));
        base.idempotencia.push(copiar(r));
      },
    },
  };
}

export class UnitOfWorkEnMemoria implements UnitOfWork {
  readonly repos: Repositorios;

  constructor(readonly base: BaseEnMemoria = new BaseEnMemoria()) {
    this.repos = repositoriosEnMemoria(base);
  }

  async ejecutar<T>(trabajo: (repos: Repositorios) => Promise<T>): Promise<T> {
    const respaldo = copiar({ ...this.base, eventosProcesados: [...this.base.eventosProcesados] });
    try {
      return await trabajo(this.repos);
    } catch (error) {
      Object.assign(this.base, { ...respaldo, eventosProcesados: new Set(respaldo.eventosProcesados) });
      throw error;
    }
  }
}

export class RelojFijo implements Reloj {
  constructor(public instante = new Date('2026-10-01T12:00:00.000Z')) {}
  ahora(): Date {
    return new Date(this.instante);
  }
  avanzar(ms: number): void {
    this.instante = new Date(this.instante.getTime() + ms);
  }
}

export class IdsSecuenciales implements GeneradorId {
  private n = 0;
  uuid(): string {
    this.n++;
    return `00000000-0000-4000-8000-${String(this.n).padStart(12, '0')}`;
  }
}

export const loggerSilencioso = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  fatal: () => undefined,
  trace: () => undefined,
  child: () => loggerSilencioso,
} as never;

/** UUID reales (para PostgreSQL, que valida el formato). */
export class IdsReales implements GeneradorId {
  uuid(): string {
    return crypto.randomUUID();
  }
}
