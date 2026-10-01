import { DomainError } from '../../domain/errors.js';
import type { OperacionCore, TipoOperacion } from '../../domain/operaciones.js';
import type { CuentaDebito } from '../../domain/plan/plan-ahorro.js';
import { estadoDe } from '../../domain/plan/estados-plan.js';
import type { UnitOfWork } from '../ports/repositorios.js';
import type { GeneradorId, Reloj } from '../ports/servicios.js';
import type { ClientesService } from './clientes.service.js';
import { obtenerPlanAccesible, type Actor } from './comunes.js';
import { SolicitudesCore } from './solicitudes-core.js';

/**
 * Aportes bajo solicitud (DebitoSolicitado) y retiros parciales (CreditoSolicitado).
 * Ambos responden 202: el resultado llega después por eventos desde el Core.
 */
export class MovimientosDineroService {
  private readonly solicitudes: SolicitudesCore;

  constructor(
    private readonly uow: UnitOfWork,
    private readonly clientes: ClientesService,
    reloj: Reloj,
    ids: GeneradorId,
  ) {
    this.solicitudes = new SolicitudesCore(ids, reloj);
  }

  async solicitarAporte(actor: Actor, planId: string, montoCentavos: number, cuentaOrigenId?: string): Promise<OperacionCore> {
    const cuentaElegida = await this.cuentaOpcional(actor, cuentaOrigenId);
    return this.uow.ejecutar(async (repos) => {
      const plan = await obtenerPlanAccesible(repos, actor, planId, true);
      estadoDe(plan).validarAporte(plan);
      return this.solicitudes.solicitar(repos, { plan, tipo: 'APORTE', montoCentavos, cuenta: cuentaElegida ?? plan.cuentaDebito });
    });
  }

  async solicitarRetiro(actor: Actor, planId: string, montoCentavos: number, cuentaDestinoId?: string): Promise<OperacionCore> {
    const cuentaElegida = await this.cuentaOpcional(actor, cuentaDestinoId);
    return this.uow.ejecutar(async (repos) => {
      // El bloqueo de fila evita que dos retiros simultáneos superen el saldo disponible.
      const plan = await obtenerPlanAccesible(repos, actor, planId, true);
      estadoDe(plan).validarRetiro(plan, montoCentavos);
      return this.solicitudes.solicitar(repos, { plan, tipo: 'RETIRO', montoCentavos, cuenta: cuentaElegida ?? plan.cuentaDebito });
    });
  }

  obtenerAporte(actor: Actor, planId: string, aporteId: string): Promise<OperacionCore> {
    return this.obtener(actor, planId, aporteId, ['APORTE'], 'el aporte');
  }

  obtenerRetiro(actor: Actor, planId: string, retiroId: string): Promise<OperacionCore> {
    return this.obtener(actor, planId, retiroId, ['RETIRO'], 'el retiro');
  }

  private async obtener(actor: Actor, planId: string, id: string, tipos: TipoOperacion[], nombre: string): Promise<OperacionCore> {
    await obtenerPlanAccesible(this.uow.repos, actor, planId);
    const operacion = await this.uow.repos.operaciones.obtenerDelPlan(planId, id, tipos);
    if (!operacion) throw new DomainError('NO_ENCONTRADO', `No existe ${nombre} ${id}.`);
    return operacion;
  }

  private cuentaOpcional(actor: Actor, cuentaId?: string): Promise<CuentaDebito | undefined> {
    return cuentaId ? this.clientes.cuentaDelCliente(actor.usuarioId, cuentaId) : Promise.resolve(undefined);
  }
}
