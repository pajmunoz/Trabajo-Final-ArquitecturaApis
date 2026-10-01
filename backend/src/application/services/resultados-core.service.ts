import { estadoCuotaDe, type Cuota } from '../../domain/cuota/cuota.js';
import type { ResultadoCore } from '../../domain/eventos.js';
import { sumarMeses } from '../../domain/fechas.js';
import { esDebito, etiquetaCuenta, type OperacionCore, type TipoMovimiento } from '../../domain/operaciones.js';
import { saldoDisponible, type PlanAhorro } from '../../domain/plan/plan-ahorro.js';
import { estadoDe } from '../../domain/plan/estados-plan.js';
import type { Logger } from '../../shared/logger.js';
import type { Repositorios, UnitOfWork } from '../ports/repositorios.js';
import type { GeneradorId, Reloj } from '../ports/servicios.js';
import { SolicitudesCore } from './solicitudes-core.js';

export const CONSUMIDOR_RESULTADOS = 'batch.resultados';

const MOVIMIENTO_POR_OPERACION: Record<OperacionCore['tipo'], TipoMovimiento> = {
  CUOTA: 'APORTE_AUTOMATICO',
  APORTE: 'APORTE_MANUAL',
  RETIRO: 'RETIRO',
  DEVOLUCION: 'DEVOLUCION',
};

const DESCRIPCION: Record<OperacionCore['tipo'], string> = {
  CUOTA: 'Aporte automático programado',
  APORTE: 'Aporte voluntario',
  RETIRO: 'Retiro de fondos',
  DEVOLUCION: 'Devolución de fondos',
};

/**
 * Observer del lado del Batch: consume el resultado de todo débito y crédito con
 * el Core y lo registra en el ledger, así el asiento contable se implementa una
 * sola vez. Es idempotente: un evento repetido se descarta por su id.
 */
export class ResultadosCoreService {
  private readonly solicitudes: SolicitudesCore;

  constructor(
    private readonly uow: UnitOfWork,
    private readonly reloj: Reloj,
    private readonly ids: GeneradorId,
    private readonly logger: Logger,
  ) {
    this.solicitudes = new SolicitudesCore(ids, reloj);
  }

  async procesar(evento: ResultadoCore): Promise<void> {
    await this.uow.ejecutar(async (repos) => {
      if (!(await repos.eventosProcesados.registrarSiNuevo(evento.id, CONSUMIDOR_RESULTADOS))) {
        this.logger.info({ eventoId: evento.id }, 'Evento duplicado descartado');
        return;
      }
      const operacion = await repos.operaciones.obtener(evento.datos.operacionId, { paraActualizar: true });
      if (!operacion || operacion.estado !== 'PENDIENTE') return;
      const plan = await repos.planes.obtener(operacion.planId, { paraActualizar: true });
      if (!plan) return;

      const exito = evento.tipo === 'DebitoEjecutado' || evento.tipo === 'CreditoEjecutado';
      const ahora = this.reloj.ahora().toISOString();
      await repos.operaciones.actualizar({
        ...operacion,
        estado: exito ? 'EJECUTADO' : 'FALLIDO',
        motivoFallo: exito ? null : (evento.datos.motivo ?? 'CORE_NO_DISPONIBLE'),
        procesadoEn: ahora,
      });

      if (exito) await this.registrarExito(repos, operacion, plan);
      else await this.registrarFallo(repos, operacion, plan, evento.datos.causa ?? 'TECNICA');
    });
  }

  private async registrarExito(repos: Repositorios, operacion: OperacionCore, plan: PlanAhorro): Promise<void> {
    const signo = esDebito(operacion.tipo) ? 1 : -1;
    await repos.movimientos.asentar({
      id: this.ids.uuid(),
      planId: plan.id,
      tipo: MOVIMIENTO_POR_OPERACION[operacion.tipo],
      montoCentavos: signo * operacion.montoCentavos,
      moneda: 'USD',
      fecha: this.reloj.ahora().toISOString(),
      descripcion: DESCRIPCION[operacion.tipo],
      origen: operacion.tipo === 'CUOTA' ? 'Débito automático' : etiquetaCuenta(operacion.cuenta),
      referencia: {
        tipo: operacion.tipo === 'CUOTA' ? 'CUOTA' : operacion.tipo === 'APORTE' ? 'APORTE' : operacion.tipo === 'RETIRO' ? 'RETIRO' : 'CANCELACION',
        id: operacion.cuotaId ?? operacion.id,
      },
      correlationId: operacion.correlationId,
    });

    if (operacion.cuotaId) {
      const cuota = await repos.cuotas.obtener(operacion.cuotaId, { paraActualizar: true });
      if (cuota) await repos.cuotas.actualizar(estadoCuotaDe(cuota).registrarExito(cuota, this.reloj.ahora()));
      if (operacion.corridaId) await repos.corridas.incrementar(operacion.corridaId, 'ejecutadas');
    }

    if (!esDebito(operacion.tipo)) return;
    const actualizado = (await repos.planes.obtener(plan.id)) ?? plan;

    if (actualizado.estado !== 'ACTIVO') {
      // Un débito que llegó después de cancelar: el dinero vuelve a la cuenta.
      await this.solicitudes.solicitar(repos, { plan, tipo: 'DEVOLUCION', montoCentavos: operacion.montoCentavos, cuenta: operacion.cuenta });
      return;
    }
    if (estadoDe(actualizado).debeCompletarse(actualizado)) await this.completar(repos, actualizado);
  }

  /** El plan alcanzó la meta: se completa y se liquidan los fondos a la cuenta de débito. */
  private async completar(repos: Repositorios, plan: PlanAhorro): Promise<void> {
    await repos.cuotas.cancelarProgramadas(plan.id);
    await repos.planes.actualizar({ ...plan, estado: 'COMPLETADO', bloqueado: false, bloqueadoDesde: null, actualizadoEn: this.reloj.ahora().toISOString() });
    const monto = saldoDisponible(plan);
    if (monto > 0) {
      await this.solicitudes.solicitar(repos, { plan, tipo: 'DEVOLUCION', montoCentavos: monto, cuenta: plan.cuentaDebito });
    }
    this.logger.info({ planId: plan.id }, 'Plan completado');
  }

  private async registrarFallo(repos: Repositorios, operacion: OperacionCore, plan: PlanAhorro, causa: 'NEGOCIO' | 'TECNICA'): Promise<void> {
    if (!operacion.cuotaId) {
      if (operacion.tipo === 'DEVOLUCION') {
        this.logger.warn({ operacionId: operacion.id, planId: plan.id }, 'Devolución fallida: requiere revisión del operador');
      }
      return;
    }
    const cuota = await repos.cuotas.obtener(operacion.cuotaId, { paraActualizar: true });
    if (!cuota) return;
    const ahora = this.reloj.ahora();
    const corrida = operacion.corridaId;

    // Un error técnico del banco no consume intentos del cliente.
    if (causa === 'TECNICA') {
      await repos.cuotas.actualizar(estadoCuotaDe(cuota).registrarFalloTecnico(cuota, ahora));
      if (corrida) await repos.corridas.incrementar(corrida, 'erroresTecnicos');
      return;
    }

    const { cuota: rechazada, cancelada } = estadoCuotaDe(cuota).registrarRechazo(cuota, ahora);
    await repos.cuotas.actualizar(rechazada);
    if (corrida) await repos.corridas.incrementar(corrida, 'rechazadas');
    if (!cancelada) {
      if (corrida) await repos.corridas.incrementar(corrida, 'reprogramadas');
      return;
    }
    if (corrida) await repos.corridas.incrementar(corrida, 'canceladas');
    await this.prorrogar(repos, plan, rechazada);
  }

  /** Quinto rechazo: la cuota se cancela y el plazo crece un mes, sin mora ni cobro doble. */
  private async prorrogar(repos: Repositorios, plan: PlanAhorro, cancelada: Cuota): Promise<void> {
    const ultima = (await repos.cuotas.ultimaDelPlan(plan.id)) ?? cancelada;
    const fecha = sumarMeses(ultima.fechaProgramada, 1);
    const nueva: Cuota = {
      id: this.ids.uuid(),
      planId: plan.id,
      numero: ultima.numero + 1,
      fechaProgramada: fecha,
      montoCentavos: plan.cuotaMensualCentavos,
      estado: 'PROGRAMADA',
      intentos: 0,
      proximoIntento: null,
      ejecutadaEn: null,
    };
    await repos.cuotas.crearVarias([nueva]);
    await repos.planes.actualizar({
      ...plan,
      plazoMeses: plan.plazoMeses + 1,
      prorrogasMeses: plan.prorrogasMeses + 1,
      fechaFinEstimada: fecha,
      actualizadoEn: this.reloj.ahora().toISOString(),
    });
  }
}
