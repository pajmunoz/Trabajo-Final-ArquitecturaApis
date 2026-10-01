import { estadoCuotaDe, type Cuota } from '../../domain/cuota/cuota.js';
import { calculoInteresPara } from '../../domain/estrategias/calculo-interes.strategy.js';
import { fechaDe } from '../../domain/fechas.js';
import type { Logger } from '../../shared/logger.js';
import type { CorridaCobro, UnitOfWork } from '../ports/repositorios.js';
import type { GeneradorId, Reloj } from '../ports/servicios.js';
import { SolicitudesCore } from './solicitudes-core.js';

/**
 * Corte diario del Batch Processor (RF-03.1, RNF-01.2). El procedimiento
 * almacenado solo selecciona las cuotas del día; las transiciones (State), el
 * interés (Strategy) y la publicación de DebitoSolicitado quedan aquí.
 */
export class CorteDebitosService {
  private readonly solicitudes: SolicitudesCore;

  constructor(
    private readonly uow: UnitOfWork,
    private readonly reloj: Reloj,
    private readonly ids: GeneradorId,
    private readonly logger: Logger,
  ) {
    this.solicitudes = new SolicitudesCore(ids, reloj);
  }

  async ejecutar(fechaCorte: string = fechaDe(this.reloj.ahora())): Promise<CorridaCobro> {
    const corrida: CorridaCobro = {
      id: this.ids.uuid(),
      fechaCorte,
      estado: 'EN_PROCESO',
      iniciadaEn: this.reloj.ahora().toISOString(),
      finalizadaEn: null,
      totalCuotas: 0,
      ejecutadas: 0,
      rechazadas: 0,
      reprogramadas: 0,
      canceladas: 0,
      erroresTecnicos: 0,
    };
    await this.uow.repos.corridas.crear(corrida);

    try {
      const cuotas = await this.uow.repos.cuotas.seleccionarDebitosDelDia(fechaCorte, this.reloj.ahora().toISOString());
      for (const cuota of cuotas) {
        if (await this.cobrar(cuota, corrida.id)) corrida.totalCuotas++;
      }
      corrida.estado = 'COMPLETADA';
    } catch (error) {
      corrida.estado = 'FALLIDA';
      this.logger.error({ err: error, corridaId: corrida.id }, 'La corrida de cobro falló');
    }

    corrida.finalizadaEn = this.reloj.ahora().toISOString();
    const actual = (await this.uow.repos.corridas.obtener(corrida.id)) ?? corrida;
    await this.uow.repos.corridas.actualizar({ ...actual, estado: corrida.estado, totalCuotas: corrida.totalCuotas, finalizadaEn: corrida.finalizadaEn });
    this.logger.info({ corridaId: corrida.id, fechaCorte, cuotas: corrida.totalCuotas }, 'Corrida de cobro terminada');
    return { ...actual, estado: corrida.estado, totalCuotas: corrida.totalCuotas, finalizadaEn: corrida.finalizadaEn };
  }

  /** Cada cuota en su propia transacción: un error en una no detiene el corte. */
  private async cobrar(seleccionada: Cuota, corridaId: string): Promise<boolean> {
    try {
      return await this.uow.ejecutar(async (repos) => {
        const cuota = await repos.cuotas.obtener(seleccionada.id, { paraActualizar: true });
        if (!cuota || (cuota.estado !== 'PROGRAMADA' && cuota.estado !== 'PENDIENTE')) return false;
        const plan = await repos.planes.obtener(cuota.planId, { paraActualizar: true });
        if (!plan || plan.estado !== 'ACTIVO') return false;

        // El interés del mes se devenga una vez, cuando la cuota entra al primer cobro.
        if (cuota.estado === 'PROGRAMADA') {
          const estrategia = calculoInteresPara(plan.bloqueado);
          const interes = estrategia.interesMensual(plan.saldoCentavos, plan.tasas);
          if (interes > 0) {
            await repos.movimientos.asentar({
              id: this.ids.uuid(),
              planId: plan.id,
              tipo: 'INTERES',
              montoCentavos: interes,
              moneda: 'USD',
              fecha: this.reloj.ahora().toISOString(),
              descripcion: 'Interés mensual acreditado',
              origen: 'Rendimiento',
              referencia: { tipo: 'CUOTA', id: cuota.id },
              correlationId: null,
            });
          }
        }

        await repos.cuotas.actualizar(estadoCuotaDe(cuota).iniciarCobro(cuota));
        await this.solicitudes.solicitar(repos, {
          plan,
          tipo: 'CUOTA',
          montoCentavos: cuota.montoCentavos,
          cuenta: plan.cuentaDebito,
          cuotaId: cuota.id,
          corridaId,
        });
        return true;
      });
    } catch (error) {
      this.logger.error({ err: error, cuotaId: seleccionada.id }, 'No se pudo iniciar el cobro de la cuota');
      return false;
    }
  }
}
