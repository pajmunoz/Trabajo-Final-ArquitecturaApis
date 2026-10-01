import { MongoClient } from 'mongodb';
import { cargarConfig } from '../config/env.js';
import { crearLogger } from '../shared/logger.js';
import { asegurarDatosDePrueba } from '../simulador-core/semilla.js';
import { crearServidorCore } from '../simulador-core/servidor.js';
import { cierreOrdenado, fallaAlIniciar } from './arranque.js';

/** Proceso Core bancario simulado (MongoDB Atlas del equipo). Fuera del alcance del producto. */
async function iniciar() {
  const config = cargarConfig();
  const logger = crearLogger('core-simulado', config.LOG_LEVEL);
  const mongo = await MongoClient.connect(config.MONGO_URI);
  const db = mongo.db(config.MONGO_DB);
  const cambios = await asegurarDatosDePrueba(db);
  logger.info({ baseDatos: config.MONGO_DB, cambios }, 'Datos del Core simulado verificados');

  const app = crearServidorCore(db, logger, {
    latenciaMs: config.CORE_SIMULADO_LATENCIA_MS,
    porcentaje: config.CORE_SIMULADO_FALLA_PORCENTAJE,
  });
  const servidor = app.listen(config.CORE_SIMULADO_PORT, config.HOST, () =>
    logger.info(`Core simulado escuchando en ${config.HOST}:${config.CORE_SIMULADO_PORT}`),
  );
  cierreOrdenado(logger, servidor, [() => mongo.close()]);
}

iniciar().catch(fallaAlIniciar(crearLogger('core-simulado')));
