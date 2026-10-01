import type { CoreBancarioPort } from '../../application/ports/core-bancario.port.js';
import type { Config } from '../../config/env.js';
import type { Logger } from '../../shared/logger.js';
import { CoreLegacyAdapter } from './core-legacy.adapter.js';
import { CoreSimuladoAdapter } from './core-simulado.adapter.js';
import { CircuitBreakerCoreDecorator } from './decoradores/circuit-breaker.decorator.js';
import { LoggingCoreDecorator } from './decoradores/logging.decorator.js';
import { RetryCoreDecorator } from './decoradores/retry.decorator.js';
import { TimeoutCoreDecorator } from './decoradores/timeout.decorator.js';

/**
 * Arma el puerto del Core según el camino (Fase 2, §4.2):
 *  - síncrono (el cliente espera): CircuitBreaker → Logging → Timeout(2 s) → Adapter, sin Retry.
 *  - asíncrono (eventos):          Retry → CircuitBreaker → Logging → Timeout → Adapter.
 */
export function construirPuertoCore(
  config: Config,
  logger: Logger,
  camino: 'sincrono' | 'asincrono',
  adaptador: CoreBancarioPort = config.CORE_MODO === 'memoria' ? new CoreSimuladoAdapter() : new CoreLegacyAdapter(config.CORE_BASE_URL),
): { puerto: CoreBancarioPort; circuito: CircuitBreakerCoreDecorator } {
  const conTimeout = new TimeoutCoreDecorator(adaptador, config.CORE_TIMEOUT_MS);
  const conLogging = new LoggingCoreDecorator(conTimeout, logger);
  const circuito = new CircuitBreakerCoreDecorator(
    conLogging,
    { umbralErrorPorcentaje: config.CB_UMBRAL_ERROR_PORCENTAJE, ventanaMs: config.CB_VENTANA_MS, resetMs: config.CB_RESET_MS },
    logger,
  );
  const puerto =
    camino === 'asincrono'
      ? new RetryCoreDecorator(circuito, { intentos: config.RETRY_INTENTOS, baseMs: config.RETRY_BASE_MS }, logger)
      : circuito;
  return { puerto, circuito };
}
