import type { Cuota } from '../../domain/cuota/cuota.js';
import { DomainError } from '../../domain/errors.js';
import { calculoInteresPara } from '../../domain/estrategias/calculo-interes.strategy.js';
import { politicaSalidaPara } from '../../domain/estrategias/salida-bloqueo.strategy.js';
import { fechaDe, proximaFechaConDia, sumarMeses } from '../../domain/fechas.js';
import type { CuentaDebito, EstadoPlan, Icono, PlanAhorro } from '../../domain/plan/plan-ahorro.js';
import { saldoDisponible } from '../../domain/plan/plan-ahorro.js';
import { estadoDe } from '../../domain/plan/estados-plan.js';
import type { EstadoOperacion } from '../../domain/operaciones.js';
import { simular } from '../../domain/simulacion.js';
import { paginaOffset, type PaginaOffset } from '../../shared/paginacion.js';
import type { OrdenPlanes, Repositorios, ResumenPlanes, UnitOfWork } from '../ports/repositorios.js';
import type { GeneradorId, Reloj } from '../ports/servicios.js';
import type { ClientesService } from './clientes.service.js';
import { esPersonalInterno, FabricaEventos, obtenerPlanAccesible, type Actor } from './comunes.js';
import { SolicitudesCore } from './solicitudes-core.js';

export interface CrearPlanInput {
  nombre: string;
  objetivo?: string;
  icono: Icono;
  montoMetaCentavos: number;
  fechaObjetivo: string;
  diaDebito: number;
  cuentaDebitoId: string;
  bloqueado: boolean;
}

export interface ModificarPlanInput {
  nombre?: string;
  objetivo?: string;
  icono?: Icono;
  diaDebito?: number;
}

export interface ListarPlanesInput {
  estados?: EstadoPlan[];
  bloqueado?: boolean;
  clienteId?: string;
  orden: OrdenPlanes;
  pagina: number;
  limite: number;
}

export interface Cancelacion {
  plan: PlanAhorro;
  saldoCentavos: number;
  interesesPerdidosCentavos: number;
  montoDevueltoCentavos: number;
  cuentaDestino: CuentaDebito;
  estadoDevolucion: EstadoOperacion;
}

/** Calendario de cuotas: una por mes en el día de débito elegido, desde el próximo. */
export function generarCalendario(
  planId: string,
  desde: string,
  diaDebito: number,
  cantidad: number,
  montoCentavos: number,
  ids: GeneradorId,
  numeroInicial = 1,
): Cuota[] {
  const primera = proximaFechaConDia(desde, diaDebito);
  return Array.from({ length: cantidad }, (_, i) => ({
    id: ids.uuid(),
    planId,
    numero: numeroInicial + i,
    fechaProgramada: sumarMeses(primera, i),
    montoCentavos,
    estado: 'PROGRAMADA' as const,
    intentos: 0,
    proximoIntento: null,
    ejecutadaEn: null,
  }));
}

export class PlanesService {
  private readonly eventos: FabricaEventos;
  private readonly solicitudes: SolicitudesCore;

  constructor(
    private readonly uow: UnitOfWork,
    private readonly clientes: ClientesService,
    private readonly reloj: Reloj,
    private readonly ids: GeneradorId,
  ) {
    this.eventos = new FabricaEventos(ids, reloj);
    this.solicitudes = new SolicitudesCore(ids, reloj);
  }

  private hoy(): string {
    return fechaDe(this.reloj.ahora());
  }

  async listar(actor: Actor, input: ListarPlanesInput): Promise<PaginaOffset<PlanAhorro> & { resumen: ResumenPlanes }> {
    if (input.clienteId && !esPersonalInterno(actor)) {
      throw new DomainError('PERMISO_INSUFICIENTE', 'Solo OPERADOR y AUDITOR pueden filtrar por clienteId.');
    }
    const filtro = {
      clienteId: esPersonalInterno(actor) ? input.clienteId : actor.usuarioId,
      estados: input.estados,
      bloqueado: input.bloqueado,
    };
    const [{ items, total }, resumen] = await Promise.all([
      this.uow.repos.planes.listar(filtro, input.orden, input.pagina, input.limite),
      this.uow.repos.planes.resumen(filtro),
    ]);
    return { ...paginaOffset(items, input.pagina, input.limite, total), resumen };
  }

  obtener(actor: Actor, planId: string): Promise<PlanAhorro> {
    return obtenerPlanAccesible(this.uow.repos, actor, planId);
  }

  async crear(actor: Actor, input: CrearPlanInput): Promise<PlanAhorro> {
    // Camino síncrono hacia el Core: valida la cuenta antes de abrir la transacción.
    const cuentaDebito = await this.clientes.cuentaDelCliente(actor.usuarioId, input.cuentaDebitoId);
    const hoy = this.hoy();
    const simulacion = simular(input.montoMetaCentavos, input.fechaObjetivo, input.bloqueado, hoy);
    const ahora = this.reloj.ahora().toISOString();
    const planId = this.ids.uuid();
    const cuotas = generarCalendario(planId, hoy, input.diaDebito, simulacion.plazoMeses, simulacion.cuotaMensualCentavos, this.ids);

    const plan: PlanAhorro = {
      id: planId,
      clienteId: actor.usuarioId,
      nombre: input.nombre,
      objetivo: input.objetivo,
      icono: input.icono,
      estado: 'ACTIVO',
      moneda: 'USD',
      montoMetaCentavos: input.montoMetaCentavos,
      fechaObjetivo: input.fechaObjetivo,
      cuotaMensualCentavos: simulacion.cuotaMensualCentavos,
      plazoMeses: simulacion.plazoMeses,
      prorrogasMeses: 0,
      diaDebito: input.diaDebito,
      cuentaDebito,
      bloqueado: input.bloqueado,
      bloqueadoDesde: input.bloqueado ? ahora : null,
      tasas: simulacion.tasas,
      saldoCentavos: 0,
      reservadoCentavos: 0,
      interesesDevengadosCentavos: 0,
      fechaInicio: hoy,
      fechaFinEstimada: cuotas[cuotas.length - 1]?.fechaProgramada ?? input.fechaObjetivo,
      version: 1,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    return this.uow.ejecutar(async (repos) => {
      await repos.planes.crear(plan);
      await repos.cuotas.crearVarias(cuotas);
      await repos.outbox.agregar(this.eventos.crear('PlanCreado', { planId, clienteId: plan.clienteId, nombre: plan.nombre }));
      return (await repos.planes.obtener(planId)) ?? plan;
    });
  }

  async modificar(actor: Actor, planId: string, cambios: ModificarPlanInput, versionEsperada?: number): Promise<PlanAhorro> {
    return this.uow.ejecutar(async (repos) => {
      const plan = await obtenerPlanAccesible(repos, actor, planId, true);
      if (versionEsperada !== undefined && versionEsperada !== plan.version) {
        throw new DomainError('VERSION_DESACTUALIZADA', 'El plan cambió desde que se leyó.');
      }
      estadoDe(plan).validarModificacion(plan);

      if (cambios.diaDebito !== undefined && cambios.diaDebito !== plan.diaDebito) {
        await this.reprogramarCuotas(repos, plan, cambios.diaDebito);
      }
      const actualizado = await repos.planes.actualizar({
        ...plan,
        ...(cambios.nombre !== undefined && { nombre: cambios.nombre }),
        ...(cambios.objetivo !== undefined && { objetivo: cambios.objetivo }),
        ...(cambios.icono !== undefined && { icono: cambios.icono }),
        ...(cambios.diaDebito !== undefined && { diaDebito: cambios.diaDebito }),
        actualizadoEn: this.reloj.ahora().toISOString(),
      });
      return actualizado;
    });
  }

  /** El nuevo día aplica desde la próxima cuota que todavía no entró en cobro. */
  private async reprogramarCuotas(repos: Repositorios, plan: PlanAhorro, diaDebito: number): Promise<void> {
    const { items } = await repos.cuotas.listarPorPlan(plan.id, ['PROGRAMADA'], 1, 1000);
    const primera = proximaFechaConDia(this.hoy(), diaDebito);
    const ordenadas = [...items].sort((a, b) => a.numero - b.numero);
    for (const [i, cuota] of ordenadas.entries()) {
      await repos.cuotas.actualizar({ ...cuota, fechaProgramada: sumarMeses(primera, i) });
    }
    if (ordenadas.length > 0) plan.fechaFinEstimada = sumarMeses(primera, ordenadas.length - 1);
  }

  async bloquear(actor: Actor, planId: string): Promise<PlanAhorro> {
    return this.uow.ejecutar(async (repos) => {
      const plan = await obtenerPlanAccesible(repos, actor, planId, true);
      estadoDe(plan).validarBloqueo(plan);
      const ahora = this.reloj.ahora().toISOString();
      return repos.planes.actualizar({
        ...plan,
        bloqueado: true,
        bloqueadoDesde: ahora,
        // La tasa base queda congelada; el bono sale del tramo del plan (Strategy).
        tasas: calculoInteresPara(true).tasas(plan.plazoMeses, plan.tasas.baseAnual),
        actualizadoEn: ahora,
      });
    });
  }

  async desbloquear(actor: Actor, planId: string): Promise<{ plan: PlanAhorro; interesesPerdidosCentavos: number }> {
    return this.uow.ejecutar(async (repos) => {
      const plan = await obtenerPlanAccesible(repos, actor, planId, true);
      estadoDe(plan).validarDesbloqueo(plan);
      const perdidos = await this.aplicarSalidaDelBloqueo(repos, plan, 'DESBLOQUEO', 'Intereses perdidos por desbloqueo');
      const ahora = this.reloj.ahora().toISOString();
      const actualizado = await repos.planes.actualizar({
        ...plan,
        bloqueado: false,
        bloqueadoDesde: null,
        tasas: calculoInteresPara(false).tasas(plan.plazoMeses, plan.tasas.baseAnual),
        actualizadoEn: ahora,
      });
      return { plan: actualizado, interesesPerdidosCentavos: perdidos };
    });
  }

  async cancelar(actor: Actor, planId: string, cuentaDestinoId?: string): Promise<Cancelacion> {
    const cuentaElegida = cuentaDestinoId
      ? await this.clientes.cuentaDelCliente(actor.usuarioId, cuentaDestinoId)
      : undefined;

    return this.uow.ejecutar(async (repos) => {
      const plan = await obtenerPlanAccesible(repos, actor, planId, true);
      estadoDe(plan).validarCancelacion(plan);
      const cuentaDestino = cuentaElegida ?? plan.cuentaDebito;

      const perdidos = await this.aplicarSalidaDelBloqueo(repos, plan, 'CANCELACION', 'Intereses perdidos por cancelación');
      const saldo = plan.saldoCentavos - perdidos;
      const aDevolver = saldoDisponible({ saldoCentavos: saldo, reservadoCentavos: plan.reservadoCentavos });
      await repos.cuotas.cancelarProgramadas(plan.id);

      let estadoDevolucion: EstadoOperacion = 'EJECUTADO';
      if (aDevolver > 0) {
        await this.solicitudes.solicitar(repos, { plan, tipo: 'DEVOLUCION', montoCentavos: aDevolver, cuenta: cuentaDestino });
        estadoDevolucion = 'PENDIENTE';
      }
      await repos.outbox.agregar(this.eventos.crear('PlanCancelado', { planId, clienteId: plan.clienteId, nombre: plan.nombre }));

      const actualizado = await repos.planes.actualizar({
        ...plan,
        estado: 'CANCELADO',
        bloqueado: false,
        bloqueadoDesde: null,
        actualizadoEn: this.reloj.ahora().toISOString(),
      });
      return {
        plan: actualizado,
        saldoCentavos: plan.saldoCentavos,
        interesesPerdidosCentavos: perdidos,
        montoDevueltoCentavos: aDevolver,
        cuentaDestino,
        estadoDevolucion,
      };
    });
  }

  /** Strategy de salida: si el plan estaba bloqueado, asienta la pérdida de intereses en el ledger. */
  private async aplicarSalidaDelBloqueo(
    repos: Repositorios,
    plan: PlanAhorro,
    referencia: 'DESBLOQUEO' | 'CANCELACION',
    descripcion: string,
  ): Promise<number> {
    const perdidos = politicaSalidaPara(plan.bloqueado).interesesPerdidos(plan.interesesDevengadosCentavos);
    if (perdidos > 0) {
      await repos.movimientos.asentar({
        id: this.ids.uuid(),
        planId: plan.id,
        tipo: 'PENALIDAD',
        montoCentavos: -perdidos,
        moneda: 'USD',
        fecha: this.reloj.ahora().toISOString(),
        descripcion,
        origen: 'Intereses devengados',
        referencia: { tipo: referencia, id: plan.id },
        correlationId: null,
      });
    }
    return perdidos;
  }
}
