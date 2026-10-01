import { esDebito, type OperacionCore, type TipoOperacion } from '../../domain/operaciones.js';
import type { CuentaDebito, PlanAhorro } from '../../domain/plan/plan-ahorro.js';
import type { Repositorios } from '../ports/repositorios.js';
import type { GeneradorId, Reloj } from '../ports/servicios.js';
import { FabricaEventos } from './comunes.js';

export interface DatosSolicitud {
  plan: Pick<PlanAhorro, 'id'>;
  tipo: TipoOperacion;
  montoCentavos: number;
  cuenta: CuentaDebito;
  cuotaId?: string;
  corridaId?: string;
}

/**
 * Todo movimiento de dinero con el Core sigue el mismo camino: se registra la
 * operación PENDIENTE y, en la misma transacción, el evento en la outbox
 * (Transactional Outbox). DebitoSolicitado para aportes y cuotas;
 * CreditoSolicitado para retiros y devoluciones.
 */
export class SolicitudesCore {
  private readonly eventos: FabricaEventos;

  constructor(
    private readonly ids: GeneradorId,
    private readonly reloj: Reloj,
  ) {
    this.eventos = new FabricaEventos(ids, reloj);
  }

  async solicitar(repos: Repositorios, datos: DatosSolicitud): Promise<OperacionCore> {
    const { saldoDisponibleCentavos: _saldo, ...cuenta } = datos.cuenta;
    const operacion: OperacionCore = {
      id: this.ids.uuid(),
      planId: datos.plan.id,
      tipo: datos.tipo,
      montoCentavos: datos.montoCentavos,
      moneda: 'USD',
      cuenta,
      estado: 'PENDIENTE',
      motivoFallo: null,
      cuotaId: datos.cuotaId ?? null,
      corridaId: datos.corridaId ?? null,
      correlationId: this.ids.uuid(),
      solicitadoEn: this.reloj.ahora().toISOString(),
      procesadoEn: null,
    };
    await repos.operaciones.crear(operacion);
    await repos.outbox.agregar(
      this.eventos.crear(
        esDebito(datos.tipo) ? 'DebitoSolicitado' : 'CreditoSolicitado',
        {
          operacionId: operacion.id,
          planId: operacion.planId,
          tipoOperacion: operacion.tipo,
          cuentaId: cuenta.id,
          montoCentavos: operacion.montoCentavos,
          moneda: 'USD' as const,
        },
        operacion.correlationId,
      ),
    );
    return operacion;
  }
}
