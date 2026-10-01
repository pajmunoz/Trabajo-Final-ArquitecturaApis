import { readFileSync } from 'node:fs';
import { z } from 'zod';

// Configuración validada al arrancar: si falta algo obligatorio, el proceso no inicia.
const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  API_PORT: z.coerce.number().int().positive().default(3000),
  AUTH_PORT: z.coerce.number().int().positive().default(3001),
  CORE_SIMULADO_PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().default('postgres://billetera:billetera@localhost:5432/billetera'),
  RABBITMQ_URL: z.string().default('amqp://guest:guest@localhost:5672'),
  MONGO_URI: z.string().default('mongodb://localhost:27017'),
  MONGO_DB: z.string().default('core_bancario_db'),

  JWT_PRIVATE_KEY_PATH: z.string().default('keys/jwt-private.pem'),
  JWT_PUBLIC_KEY_PATH: z.string().default('keys/jwt-public.pem'),
  JWT_ISSUER: z.string().default('billetera-ahorro-auth'),
  JWT_AUDIENCE: z.string().default('billetera-ahorro-api'),
  JWT_ACCESS_TTL_SEGUNDOS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_DIAS: z.coerce.number().int().positive().default(7),

  CORE_MODO: z.enum(['http', 'memoria']).default('http'),
  CORE_BASE_URL: z.string().default('http://localhost:4000'),
  CORE_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  CB_UMBRAL_ERROR_PORCENTAJE: z.coerce.number().min(1).max(100).default(50),
  CB_VENTANA_MS: z.coerce.number().int().positive().default(10_000),
  CB_RESET_MS: z.coerce.number().int().positive().default(30_000),
  RETRY_INTENTOS: z.coerce.number().int().min(0).default(3),
  RETRY_BASE_MS: z.coerce.number().int().positive().default(1000),

  OUTBOX_INTERVALO_MS: z.coerce.number().int().positive().default(500),
  BATCH_HORA_CORTE: z.string().regex(/^\d{2}:\d{2}$/).default('06:00'),
  BATCH_INTERVALO_MS: z.coerce.number().int().positive().default(60_000),

  // Solo para demostrar resiliencia con el core simulado.
  CORE_SIMULADO_LATENCIA_MS: z.coerce.number().int().min(0).default(0),
  CORE_SIMULADO_FALLA_PORCENTAJE: z.coerce.number().min(0).max(100).default(0),
});

export type Config = z.infer<typeof esquema>;

let cache: Config | undefined;

export function cargarConfig(fuente: NodeJS.ProcessEnv = process.env): Config {
  if (!cache || fuente !== process.env) {
    const resultado = esquema.safeParse(fuente);
    if (!resultado.success) {
      throw new Error(`Configuración inválida: ${resultado.error.message}`);
    }
    if (fuente !== process.env) return resultado.data;
    cache = resultado.data;
  }
  return cache;
}

/** Lee una clave PEM desde la variable con el contenido o desde el archivo indicado. */
export function leerClave(contenido: string | undefined, ruta: string): string {
  if (contenido) return contenido.replace(/\\n/g, '\n');
  return readFileSync(ruta, 'utf8');
}
