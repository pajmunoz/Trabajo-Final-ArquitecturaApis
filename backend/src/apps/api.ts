import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { generadorUuid, relojSistema } from '../application/ports/servicios.js';
import { ClientesService } from '../application/services/clientes.service.js';
import { ConsultasService } from '../application/services/consultas.service.js';
import { MovimientosDineroService } from '../application/services/movimientos-dinero.service.js';
import { PlanesService } from '../application/services/planes.service.js';
import { SimulacionService } from '../application/services/simulacion.service.js';
import { cargarConfig, leerClave } from '../config/env.js';
import { construirPuertoCore } from '../infrastructure/core/fabrica-core.js';
import { OutboxRelay } from '../infrastructure/messaging/outbox-relay.js';
import { RabbitMq } from '../infrastructure/messaging/rabbitmq.js';
import { PgUnitOfWork } from '../infrastructure/postgres/pg-unit-of-work.js';
import { crearPool, migrar } from '../infrastructure/postgres/pool.js';
import { JwtTokenService } from '../infrastructure/security/jwt-token.service.js';
import { crearApiApp } from '../presentation/http/app.js';
import { crearLogger } from '../shared/logger.js';
import { cierreOrdenado, fallaAlIniciar } from './arranque.js';

/** contracts/openapi.yaml: en la imagen está en /app/contracts; en desarrollo, un nivel arriba de backend/. */
function ubicarContrato(): string | undefined {
  return [process.env.OPENAPI_PATH, 'contracts/openapi.yaml', '../contracts/openapi.yaml']
    .filter((r): r is string => Boolean(r))
    .map((r) => resolve(r))
    .find((r) => existsSync(r));
}

/** Proceso Ahorro Core API: endpoints REST + relay de la outbox. */
async function iniciar() {
  const config = cargarConfig();
  const logger = crearLogger('ahorro-core-api', config.LOG_LEVEL);

  const pool = crearPool(config.DATABASE_URL);
  logger.info({ archivos: await migrar(pool) }, 'Migraciones aplicadas');
  const uow = new PgUnitOfWork(pool);

  // Camino síncrono hacia el Core: Timeout + Circuit Breaker, sin Retry.
  const { puerto: core, circuito } = construirPuertoCore(config, logger, 'sincrono');
  const tokens = new JwtTokenService({
    clavePublica: leerClave(process.env.JWT_PUBLIC_KEY, config.JWT_PUBLIC_KEY_PATH),
    emisor: config.JWT_ISSUER,
    audiencia: config.JWT_AUDIENCE,
    ttlSegundos: config.JWT_ACCESS_TTL_SEGUNDOS,
  });

  const clientes = new ClientesService(uow, core);
  const app = crearApiApp({
    planes: new PlanesService(uow, clientes, relojSistema, generadorUuid),
    movimientosDinero: new MovimientosDineroService(uow, clientes, relojSistema, generadorUuid),
    consultas: new ConsultasService(uow),
    clientes,
    simulacion: new SimulacionService(relojSistema),
    tokens,
    idempotencia: uow.repos.idempotencia,
    reloj: relojSistema,
    logger,
    estadoCore: () => circuito.estado,
    rutaContrato: ubicarContrato(),
  });

  const broker = await RabbitMq.conectar(config.RABBITMQ_URL, logger);
  const relay = new OutboxRelay(pool, broker, logger);
  relay.iniciar(config.OUTBOX_INTERVALO_MS);

  const servidor = app.listen(config.API_PORT, config.HOST, () => logger.info(`API escuchando en ${config.HOST}:${config.API_PORT}`));
  cierreOrdenado(logger, servidor, [() => relay.detener(), () => circuito.apagar(), () => broker.cerrar(), () => pool.end()]);
}

iniciar().catch(fallaAlIniciar(crearLogger('ahorro-core-api')));
