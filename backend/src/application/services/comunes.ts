import { DomainError } from '../../domain/errors.js';
import type { Evento } from '../../domain/eventos.js';
import type { PlanAhorro } from '../../domain/plan/plan-ahorro.js';
import type { Repositorios, Rol } from '../ports/repositorios.js';
import type { GeneradorId, Reloj } from '../ports/servicios.js';

/** Quién hace la petición, tomado del JWT ya validado. */
export interface Actor {
  usuarioId: string;
  roles: Rol[];
}

export const esPersonalInterno = (actor: Actor) => actor.roles.includes('OPERADOR') || actor.roles.includes('AUDITOR');

/**
 * ABAC de titularidad: un CLIENTE solo accede a sus planes. Si pide uno ajeno
 * recibe NO_ENCONTRADO (404) para no revelar que el plan existe.
 */
export function asegurarAcceso(plan: PlanAhorro | null, actor: Actor, planId: string): PlanAhorro {
  if (!plan || (!esPersonalInterno(actor) && plan.clienteId !== actor.usuarioId)) {
    throw new DomainError('NO_ENCONTRADO', `No existe el plan ${planId}.`);
  }
  return plan;
}

export async function obtenerPlanAccesible(
  repos: Repositorios,
  actor: Actor,
  planId: string,
  paraActualizar = false,
): Promise<PlanAhorro> {
  return asegurarAcceso(await repos.planes.obtener(planId, { paraActualizar }), actor, planId);
}

export class FabricaEventos {
  constructor(
    private readonly ids: GeneradorId,
    private readonly reloj: Reloj,
  ) {}

  crear<T extends string, D>(tipo: T, datos: D, correlationId: string = this.ids.uuid()): Evento<T, D> {
    return { id: this.ids.uuid(), tipo, correlationId, ocurridoEn: this.reloj.ahora().toISOString(), datos };
  }
}
