import { generadorUuid, relojSistema } from '../application/ports/servicios.js';
import { EjecutorCoreService } from '../application/services/ejecutor-core.service.js';
import { cargarConfig } from '../config/env.js';
import type { CreditoSolicitado, DebitoSolicitado } from '../domain/eventos.js';
import { construirPuertoCore } from '../infrastructure/core/fabrica-core.js';
import { RabbitMq } from '../infrastructure/messaging/rabbitmq.js';
import { crearLogger } from '../shared/logger.js';
import { cierreOrdenado, fallaAlIniciar } from './arranque.js';

/**
 * Proceso Adaptador Core (Fachada): único punto de contacto con el Core bancario.
 * Consume DebitoSolicitado / CreditoSolicitado, llama al Core con
 * Retry → Circuit Breaker → Logging → Timeout, y publica el resultado.
 * No tiene base propia: el Core deduplica por la referencia de la operación.
 */
async function iniciar() {
  const config = cargarConfig();
  const logger = crearLogger('adaptador-core', config.LOG_LEVEL);
  const { puerto, circuito } = construirPuertoCore(config, logger, 'asincrono');
  const ejecutor = new EjecutorCoreService(puerto, generadorUuid, relojSistema, logger);
  const broker = await RabbitMq.conectar(config.RABBITMQ_URL, logger);

  await broker.consumir('solicitudesCore', async (evento) => {
    const resultado = await ejecutor.ejecutar(evento as DebitoSolicitado | CreditoSolicitado);
    await broker.publicar(resultado);
  });

  logger.info('Adaptador Core consumiendo solicitudes');
  cierreOrdenado(logger, undefined, [() => circuito.apagar(), () => broker.cerrar()]);
}

iniciar().catch(fallaAlIniciar(crearLogger('adaptador-core')));
