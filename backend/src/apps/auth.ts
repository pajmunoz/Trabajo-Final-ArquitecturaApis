import { relojSistema } from '../application/ports/servicios.js';
import { AuthService } from '../application/services/auth.service.js';
import { cargarConfig, leerClave } from '../config/env.js';
import { PgUnitOfWork } from '../infrastructure/postgres/pg-unit-of-work.js';
import { crearPool, migrar } from '../infrastructure/postgres/pool.js';
import { BcryptHasher } from '../infrastructure/security/bcrypt.hasher.js';
import { JwtTokenService } from '../infrastructure/security/jwt-token.service.js';
import { crearAuthApp } from '../presentation/http/app.js';
import { crearLogger } from '../shared/logger.js';
import { cierreOrdenado, fallaAlIniciar } from './arranque.js';

/** Proceso Servicio de Autenticación: único que tiene la clave privada para firmar JWT. */
async function iniciar() {
  const config = cargarConfig();
  const logger = crearLogger('servicio-autenticacion', config.LOG_LEVEL);

  const pool = crearPool(config.DATABASE_URL, 10);
  await migrar(pool);
  const tokens = new JwtTokenService({
    clavePrivada: leerClave(process.env.JWT_PRIVATE_KEY, config.JWT_PRIVATE_KEY_PATH),
    clavePublica: leerClave(process.env.JWT_PUBLIC_KEY, config.JWT_PUBLIC_KEY_PATH),
    emisor: config.JWT_ISSUER,
    audiencia: config.JWT_AUDIENCE,
    ttlSegundos: config.JWT_ACCESS_TTL_SEGUNDOS,
  });
  const auth = new AuthService(new PgUnitOfWork(pool), new BcryptHasher(), tokens, relojSistema, config.JWT_REFRESH_TTL_DIAS);

  const servidor = crearAuthApp(auth, logger).listen(config.AUTH_PORT, config.HOST, () =>
    logger.info(`Servicio de Autenticación escuchando en ${config.HOST}:${config.AUTH_PORT}`),
  );
  cierreOrdenado(logger, servidor, [() => pool.end()]);
}

iniciar().catch(fallaAlIniciar(crearLogger('servicio-autenticacion')));
