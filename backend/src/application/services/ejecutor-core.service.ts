import type { DebitoSolicitado, CreditoSolicitado, ResultadoCore } from '../../domain/eventos.js';
import type { Logger } from '../../shared/logger.js';
import { CoreRechazoError, type CoreBancarioPort } from '../ports/core-bancario.port.js';
import type { GeneradorId, Reloj } from '../ports/servicios.js';
import { FabricaEventos } from './comunes.js';

/**
 * Lo que hace el Adaptador Core al consumir una solicitud: ejecuta el débito o el
 * crédito contra el Core (puerto decorado con Retry + Circuit Breaker) y devuelve
 * el evento de resultado. Distingue el rechazo de negocio del fallo técnico.
 */
export class EjecutorCoreService {
  private readonly eventos: FabricaEventos;

  constructor(
    private readonly core: CoreBancarioPort,
    ids: GeneradorId,
    reloj: Reloj,
    private readonly logger: Logger,
  ) {
    this.eventos = new FabricaEventos(ids, reloj);
  }

  async ejecutar(solicitud: DebitoSolicitado | CreditoSolicitado): Promise<ResultadoCore> {
    const { datos } = solicitud;
    const debito = solicitud.tipo === 'DebitoSolicitado';
    const base = { operacionId: datos.operacionId, planId: datos.planId, tipoOperacion: datos.tipoOperacion };
    const movimiento = { operacionId: datos.operacionId, cuentaId: datos.cuentaId, montoCentavos: datos.montoCentavos };

    try {
      await (debito ? this.core.debitar(movimiento) : this.core.acreditar(movimiento));
      return this.eventos.crear(debito ? 'DebitoEjecutado' : 'CreditoEjecutado', base, solicitud.correlationId);
    } catch (error) {
      const negocio = error instanceof CoreRechazoError;
      this.logger.warn({ err: error, operacionId: datos.operacionId, causa: negocio ? 'NEGOCIO' : 'TECNICA' }, 'Operación con el Core fallida');
      return this.eventos.crear(
        debito ? 'DebitoFallido' : 'CreditoFallido',
        { ...base, causa: negocio ? 'NEGOCIO' : 'TECNICA', motivo: negocio ? error.motivo : 'CORE_NO_DISPONIBLE' },
        solicitud.correlationId,
      );
    }
  }
}
