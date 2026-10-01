import { generadorUuid, relojSistema } from '../application/ports/servicios.js';
import { CorteDebitosService } from '../application/services/corte-debitos.service.js';
import { ResultadosCoreService } from '../application/services/resultados-core.service.js';
import { cargarConfig } from '../config/env.js';
import type { ResultadoCore } from '../domain/eventos.js';
import { fechaDe } from '../domain/fechas.js';
import { OutboxRelay } from '../infrastructure/messaging/outbox-relay.js';
import { RabbitMq } from '../infrastructure/messaging/rabbitmq.js';
import { PgUnitOfWork } from '../infrastructure/postgres/pg-unit-of-work.js';
import { crearPool, migrar } from '../infrastructure/postgres/pool.js';
import { crearLogger } from '../shared/logger.js';
import { cierreOrdenado, fallaAlIniciar } from './arranque.js';

/**
 * Proceso Batch Processor:
 *  - CronJob: a la hora de corte ejecuta el corte diario (una vez por día).
 *  - Worker: consume los resultados de débitos y créditos y los asienta en el ledger.
 * Con `--corte [YYYY-MM-DD]` ejecuta un corte, publica la outbox y termina.
 */
async function iniciar() {
  const config = cargarConfig();
  const logger = crearLogger('batch-processor', config.LOG_LEVEL);
  const pool = crearPool(config.DATABASE_URL, 10);
  await migrar(pool);
  const uow = new PgUnitOfWork(pool);
  const corte = new CorteDebitosService(uow, relojSistema, generadorUuid, logger);
  const broker = await RabbitMq.conectar(config.RABBITMQ_URL, logger);
  const relay = new OutboxRelay(pool, broker, logger);

  const indice = process.argv.indexOf('--corte');
  if (indice >= 0) {
    const fecha = process.argv[indice + 1] ?? fechaDe(new Date());
    const corrida = await corte.ejecutar(fecha);
    while ((await relay.publicarPendientes()) > 0);
    logger.info({ corrida }, 'Corte manual terminado');
    await broker.cerrar();
    await pool.end();
    return;
  }

  const resultados = new ResultadosCoreService(uow, relojSistema, generadorUuid, logger);
  await broker.consumir('resultadosCore', (evento) => resultados.procesar(evento as ResultadoCore));
  relay.iniciar(config.OUTBOX_INTERVALO_MS);

  // Programador simple: una corrida por día a partir de la hora de corte.
  let ultimoCorte: string | undefined;
  const revisar = async () => {
    const ahora = new Date();
    const hoy = fechaDe(ahora);
    const horaActual = ahora.toISOString().slice(11, 16);
    if (horaActual < config.BATCH_HORA_CORTE || ultimoCorte === hoy) return;
    const { total } = await uow.repos.corridas.listar({ desde: hoy, hasta: hoy }, 1, 1);
    ultimoCorte = hoy;
    if (total === 0) await corte.ejecutar(hoy);
  };
  const programador = setInterval(() => void revisar().catch((e: unknown) => logger.error({ err: e }, 'Error en el programador')), config.BATCH_INTERVALO_MS);
  void revisar();

  logger.info({ horaCorte: config.BATCH_HORA_CORTE }, 'Batch Processor iniciado');
  cierreOrdenado(logger, undefined, [() => clearInterval(programador), () => relay.detener(), () => broker.cerrar(), () => pool.end()]);
}

iniciar().catch(fallaAlIniciar(crearLogger('batch-processor')));
