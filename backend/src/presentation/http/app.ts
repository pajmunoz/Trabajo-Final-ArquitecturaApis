import express, { Router, type Express } from 'express';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import type { IdempotenciaRepository } from '../../application/ports/repositorios.js';
import type { Reloj, TokenService } from '../../application/ports/servicios.js';
import type { AuthService } from '../../application/services/auth.service.js';
import type { ClientesService } from '../../application/services/clientes.service.js';
import type { ConsultasService } from '../../application/services/consultas.service.js';
import type { MovimientosDineroService } from '../../application/services/movimientos-dinero.service.js';
import type { PlanesService } from '../../application/services/planes.service.js';
import type { SimulacionService } from '../../application/services/simulacion.service.js';
import type { Logger } from '../../shared/logger.js';
import {
  AuthController,
  ClientesController,
  ConsultasController,
  MovimientosDineroController,
  SimulacionController,
} from './controllers/otros.controller.js';
import { PlanesController } from './controllers/planes.controller.js';
import * as dto from './dtos/dtos.js';
import { cacheable, exigirContenido, requestId, sinCache, validar } from './middlewares/comunes.middleware.js';
import { manejadorErrores, rutaNoEncontrada } from './middlewares/errores.middleware.js';
import { idempotencia } from './middlewares/idempotencia.middleware.js';
import { autenticar, requerir } from './middlewares/seguridad.middleware.js';

export interface DependenciasApi {
  planes: PlanesService;
  movimientosDinero: MovimientosDineroService;
  consultas: ConsultasService;
  clientes: ClientesService;
  simulacion: SimulacionService;
  tokens: TokenService;
  idempotencia: IdempotenciaRepository;
  reloj: Reloj;
  logger: Logger;
  /** Estado del Circuit Breaker para /health. */
  estadoCore?: () => string;
  /** Ruta de contracts/openapi.yaml para publicar la documentación en /docs. */
  rutaContrato?: string;
}

/** Middlewares comunes: request-id, log de cada petición (método, ruta, status, tiempo) y JSON. */
function base(logger: Logger): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('etag', 'weak');
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (_req, res) => String(res.getHeader('X-Request-Id')),
      customLogLevel: (_req, res, error) => (error || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
      serializers: { req: (req: { method: string; url: string }) => ({ method: req.method, url: req.url }) },
    }),
  );
  app.use(express.json({ type: ['application/json', 'application/merge-patch+json'], limit: '100kb' }));
  return app;
}

export function crearApiApp(d: DependenciasApi): Express {
  const app = base(d.logger);
  app.get('/health', (_req, res) => {
    res.json({ estado: 'OK', circuitoCore: d.estadoCore?.() ?? 'N/A' });
  });

  // Documentación pública: el contrato OpenAPI (fuente de verdad) y Swagger UI sobre él.
  if (d.rutaContrato) {
    const contrato = d.rutaContrato;
    app.get('/docs/openapi.yaml', (_req, res) => {
      res.type('application/yaml').sendFile(contrato);
    });
    app.use(
      '/docs',
      swaggerUi.serve,
      swaggerUi.setup(undefined, {
        customSiteTitle: 'Billetera de Ahorro — API v1',
        // validatorUrl: null evita enviar la URL del contrato a validator.swagger.io.
        swaggerOptions: { url: '/docs/openapi.yaml', persistAuthorization: true, validatorUrl: null },
      }),
    );
  }

  const planes = new PlanesController(d.planes, d.reloj);
  const dinero = new MovimientosDineroController(d.movimientosDinero);
  const consultas = new ConsultasController(d.consultas);
  const clientes = new ClientesController(d.clientes);
  const simulacion = new SimulacionController(d.simulacion);

  const v1 = Router();

  // Públicos (rate limit más estricto en el Gateway, cacheables).
  v1.get('/tarifas', cacheable(300), simulacion.tarifas);
  v1.get('/simulaciones', validar(dto.simulacionQuery, 'query'), cacheable(300), simulacion.simular);

  // Desde aquí, todo exige JWT válido y nada se guarda en caché.
  v1.use(autenticar(d.tokens), sinCache);
  const idem = idempotencia(d.idempotencia, d.logger);
  const conPlan = validar(dto.planIdParams, 'params');

  v1.get('/clientes/me', requerir('perfil:leer'), clientes.perfil);
  v1.get('/cuentas-debito', requerir('cuentas:leer'), clientes.cuentas);

  v1.get('/planes-ahorro', requerir('planes:leer'), validar(dto.listarPlanesQuery, 'query'), planes.listar);
  v1.post('/planes-ahorro', requerir('planes:escribir'), idem, validar(dto.crearPlanDto, 'body'), planes.crear);
  v1.get('/planes-ahorro/:planId', requerir('planes:leer'), conPlan, planes.obtener);
  v1.patch(
    '/planes-ahorro/:planId',
    requerir('planes:escribir'),
    exigirContenido('application/merge-patch+json'),
    conPlan,
    validar(dto.modificarPlanDto, 'body'),
    planes.modificar,
  );
  v1.post('/planes-ahorro/:planId/bloqueo', requerir('planes:escribir'), conPlan, planes.bloquear);
  v1.post('/planes-ahorro/:planId/desbloqueo', requerir('planes:escribir'), conPlan, idem, planes.desbloquear);
  v1.post('/planes-ahorro/:planId/cancelacion', requerir('planes:escribir'), conPlan, idem, validar(dto.cancelacionDto, 'body'), planes.cancelar);

  v1.post('/planes-ahorro/:planId/aportes', requerir('aportes:escribir'), conPlan, idem, validar(dto.aporteDto, 'body'), dinero.solicitarAporte);
  v1.get('/planes-ahorro/:planId/aportes/:aporteId', requerir('planes:leer'), validar(dto.aporteIdParams, 'params'), dinero.obtenerAporte);
  v1.post('/planes-ahorro/:planId/retiros', requerir('retiros:escribir'), conPlan, idem, validar(dto.retiroDto, 'body'), dinero.solicitarRetiro);
  v1.get('/planes-ahorro/:planId/retiros/:retiroId', requerir('planes:leer'), validar(dto.retiroIdParams, 'params'), dinero.obtenerRetiro);

  v1.get('/planes-ahorro/:planId/cuotas', requerir('planes:leer'), conPlan, validar(dto.cuotasQuery, 'query'), consultas.cuotas);
  v1.get('/planes-ahorro/:planId/movimientos', requerir('movimientos:leer'), conPlan, validar(dto.movimientosQuery, 'query'), consultas.movimientos);

  v1.get('/corridas-cobro', requerir('corridas:leer'), validar(dto.corridasQuery, 'query'), consultas.corridas);
  v1.get('/corridas-cobro/:corridaId', requerir('corridas:leer'), validar(dto.corridaIdParams, 'params'), consultas.corrida);

  app.use('/v1', v1);
  app.use(rutaNoEncontrada);
  app.use(manejadorErrores(d.logger));
  return app;
}

/** Servicio de Autenticación: proceso aparte, el único con la clave privada. */
export function crearAuthApp(auth: AuthService, logger: Logger): Express {
  const app = base(logger);
  const controlador = new AuthController(auth);
  app.get('/health', (_req, res) => {
    res.json({ estado: 'OK' });
  });
  app.post('/v1/auth/token', validar(dto.solicitudTokenDto, 'body'), controlador.emitirToken);
  app.use(rutaNoEncontrada);
  app.use(manejadorErrores(logger));
  return app;
}
