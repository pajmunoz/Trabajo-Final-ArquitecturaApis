import type { Request, Response } from 'express';
import type { Reloj } from '../../../application/ports/servicios.js';
import type { ModificarPlanInput, PlanesService } from '../../../application/services/planes.service.js';
import { fechaDe } from '../../../domain/fechas.js';
import type { CrearPlanDto, ListarPlanesQuery } from '../dtos/dtos.js';
import { etagDe, planAJson, versionDeIfMatch } from '../mappers/recursos.mapper.js';
import { actorDe, planIdDe } from './contexto.js';

/** Controlador delgado: traduce HTTP ↔ servicio. Express 5 propaga los errores async. */
export class PlanesController {
  constructor(
    private readonly planes: PlanesService,
    private readonly reloj: Reloj,
  ) {}

  private hoy() {
    return fechaDe(this.reloj.ahora());
  }

  listar = async (_req: Request, res: Response) => {
    const q = res.locals.query as ListarPlanesQuery;
    const pagina = await this.planes.listar(actorDe(res), {
      estados: q.estado,
      bloqueado: q.bloqueado,
      clienteId: q.clienteId,
      orden: q.orden,
      pagina: q.pagina,
      limite: q.limite,
    });
    res.json({ ...pagina, items: pagina.items.map((p) => planAJson(p, this.hoy())) });
  };

  crear = async (_req: Request, res: Response) => {
    const plan = await this.planes.crear(actorDe(res), res.locals.body as CrearPlanDto);
    res
      .status(201)
      .setHeader('Location', `/v1/planes-ahorro/${plan.id}`)
      .setHeader('ETag', etagDe(plan))
      .json(planAJson(plan, this.hoy()));
  };

  obtener = async (_req: Request, res: Response) => {
    const plan = await this.planes.obtener(actorDe(res), planIdDe(res));
    res.setHeader('ETag', etagDe(plan)).json(planAJson(plan, this.hoy()));
  };

  modificar = async (req: Request, res: Response) => {
    const plan = await this.planes.modificar(
      actorDe(res),
      planIdDe(res),
      res.locals.body as ModificarPlanInput,
      versionDeIfMatch(req.header('if-match')),
    );
    res.setHeader('ETag', etagDe(plan)).json(planAJson(plan, this.hoy()));
  };

  bloquear = async (_req: Request, res: Response) => {
    const plan = await this.planes.bloquear(actorDe(res), planIdDe(res));
    res.setHeader('ETag', etagDe(plan)).json(planAJson(plan, this.hoy()));
  };

  desbloquear = async (_req: Request, res: Response) => {
    const { plan, interesesPerdidosCentavos } = await this.planes.desbloquear(actorDe(res), planIdDe(res));
    res.setHeader('ETag', etagDe(plan)).json({ plan: planAJson(plan, this.hoy()), interesesPerdidosCentavos });
  };

  cancelar = async (_req: Request, res: Response) => {
    const body = res.locals.body as { cuentaDestinoId?: string };
    const cancelacion = await this.planes.cancelar(actorDe(res), planIdDe(res), body.cuentaDestinoId);
    res.json({ ...cancelacion, plan: planAJson(cancelacion.plan, this.hoy()) });
  };
}

