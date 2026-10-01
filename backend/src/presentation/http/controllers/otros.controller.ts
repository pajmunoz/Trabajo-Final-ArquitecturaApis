import type { Request, Response } from 'express';
import type { AuthService } from '../../../application/services/auth.service.js';
import type { ClientesService } from '../../../application/services/clientes.service.js';
import type { ConsultasService } from '../../../application/services/consultas.service.js';
import type { MovimientosDineroService } from '../../../application/services/movimientos-dinero.service.js';
import type { SimulacionService } from '../../../application/services/simulacion.service.js';
import type { EstadoCuota } from '../../../domain/cuota/cuota.js';
import type { TipoMovimiento } from '../../../domain/operaciones.js';
import { aporteAJson, retiroAJson } from '../mappers/recursos.mapper.js';
import { actorDe, planIdDe } from './contexto.js';

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  emitirToken = async (_req: Request, res: Response) => {
    const body = res.locals.body as { grantType: 'password'; email: string; contrasena: string } | { grantType: 'refresh_token'; refreshToken: string };
    const token =
      body.grantType === 'password'
        ? await this.auth.conContrasena(body.email, body.contrasena)
        : await this.auth.conRefreshToken(body.refreshToken);
    res.setHeader('Cache-Control', 'no-store').json(token);
  };
}

export class SimulacionController {
  constructor(private readonly simulacion: SimulacionService) {}

  tarifas = (_req: Request, res: Response) => {
    res.json(this.simulacion.tarifas());
  };

  simular = (_req: Request, res: Response) => {
    const q = res.locals.query as { montoMetaCentavos: number; fechaObjetivo: string; bloqueado: boolean };
    res.json(this.simulacion.simular(q.montoMetaCentavos, q.fechaObjetivo, q.bloqueado));
  };
}

export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  perfil = async (_req: Request, res: Response) => {
    res.json(await this.clientes.perfil(actorDe(res).usuarioId));
  };

  cuentas = async (_req: Request, res: Response) => {
    res.json({ items: await this.clientes.cuentas(actorDe(res).usuarioId) });
  };
}

export class MovimientosDineroController {
  constructor(private readonly servicio: MovimientosDineroService) {}

  solicitarAporte = async (_req: Request, res: Response) => {
    const body = res.locals.body as { montoCentavos: number; cuentaOrigenId?: string };
    const planId = planIdDe(res);
    const aporte = await this.servicio.solicitarAporte(actorDe(res), planId, body.montoCentavos, body.cuentaOrigenId);
    res.status(202).setHeader('Location', `/v1/planes-ahorro/${planId}/aportes/${aporte.id}`).json(aporteAJson(aporte));
  };

  obtenerAporte = async (_req: Request, res: Response) => {
    const { planId, aporteId } = res.locals.params as { planId: string; aporteId: string };
    res.json(aporteAJson(await this.servicio.obtenerAporte(actorDe(res), planId, aporteId)));
  };

  solicitarRetiro = async (_req: Request, res: Response) => {
    const body = res.locals.body as { montoCentavos: number; cuentaDestinoId?: string };
    const planId = planIdDe(res);
    const retiro = await this.servicio.solicitarRetiro(actorDe(res), planId, body.montoCentavos, body.cuentaDestinoId);
    res.status(202).setHeader('Location', `/v1/planes-ahorro/${planId}/retiros/${retiro.id}`).json(retiroAJson(retiro));
  };

  obtenerRetiro = async (_req: Request, res: Response) => {
    const { planId, retiroId } = res.locals.params as { planId: string; retiroId: string };
    res.json(retiroAJson(await this.servicio.obtenerRetiro(actorDe(res), planId, retiroId)));
  };
}

export class ConsultasController {
  constructor(private readonly consultas: ConsultasService) {}

  cuotas = async (_req: Request, res: Response) => {
    const q = res.locals.query as { estado?: EstadoCuota[]; pagina: number; limite: number };
    const pagina = await this.consultas.cuotas(actorDe(res), planIdDe(res), q.estado, q.pagina, q.limite);
    res.json({ ...pagina, items: pagina.items.map(({ planId: _p, ...cuota }) => ({ ...cuota, moneda: 'USD' })) });
  };

  movimientos = async (_req: Request, res: Response) => {
    const q = res.locals.query as { tipo?: TipoMovimiento[]; desde?: string; hasta?: string; cursor?: string; limite: number };
    const pagina = await this.consultas.movimientos(actorDe(res), planIdDe(res), {
      tipos: q.tipo,
      desde: q.desde,
      hasta: q.hasta,
      cursor: q.cursor,
      limite: q.limite,
    });
    res.json({ ...pagina, items: pagina.items.map(({ planId: _p, ...movimiento }) => movimiento) });
  };

  corridas = async (_req: Request, res: Response) => {
    const q = res.locals.query as { desde?: string; hasta?: string; estado?: 'EN_PROCESO' | 'COMPLETADA' | 'FALLIDA'; pagina: number; limite: number };
    res.json(await this.consultas.corridas({ desde: q.desde, hasta: q.hasta, estado: q.estado }, q.pagina, q.limite));
  };

  corrida = async (_req: Request, res: Response) => {
    res.json(await this.consultas.corrida((res.locals.params as { corridaId: string }).corridaId));
  };
}
