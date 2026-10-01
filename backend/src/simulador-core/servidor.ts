import express, { type Express, type Request, type Response } from 'express';
import { Decimal128, MongoServerError, type Db, type Document } from 'mongodb';
import type { Logger } from '../shared/logger.js';

/**
 * Core bancario simulado (fuera del alcance del producto). Expone sobre REST las
 * colecciones de Carina en MongoDB, como lo haría la interfaz del core real:
 *   GET  /clientes/:identificacion/cuentas[/:uuid]
 *   POST /debitos  y  POST /creditos   { referencia, cuentaId, monto: "12.34" }
 * Los movimientos son idempotentes por `referencia`. Permite inyectar latencia y
 * fallas (POST /admin/fallas) para demostrar Timeout, Retry y Circuit Breaker.
 */
export interface Fallas {
  latenciaMs: number;
  porcentaje: number;
}

const aCuenta = (c: Document) => ({
  id: c.uuid as string,
  alias: c.alias as string | undefined,
  numeroCuenta: c.numero_cuenta as string,
  tipoCuenta: c.tipo_cuenta as 'AHORROS' | 'CORRIENTE',
  moneda: 'USD' as const,
  saldo: (c.saldo as Decimal128).toString(),
});

export function crearServidorCore(db: Db, logger: Logger, fallas: Fallas): Express {
  const app = express();
  app.use(express.json());
  const cuentas = db.collection('cuentas');
  const clientes = db.collection('clientes');
  const movimientos = db.collection('movimientos_cuentas');

  app.get('/health', (_req, res) => {
    res.json({ estado: 'OK', fallas });
  });

  // Endpoint de demostración: cambia latencia y % de fallas en caliente.
  app.post('/admin/fallas', (req, res) => {
    const { latenciaMs, porcentaje } = req.body as Partial<Fallas>;
    if (typeof latenciaMs === 'number') fallas.latenciaMs = Math.max(0, latenciaMs);
    if (typeof porcentaje === 'number') fallas.porcentaje = Math.min(100, Math.max(0, porcentaje));
    logger.warn({ fallas }, 'Fallas del Core simulado actualizadas');
    res.json(fallas);
  });

  // Simula un core inestable antes de cada operación de negocio.
  app.use(async (_req, res, next) => {
    if (fallas.latenciaMs > 0) await new Promise((r) => setTimeout(r, fallas.latenciaMs));
    if (Math.random() * 100 < fallas.porcentaje) {
      res.status(503).json({ codigo: 'CORE_FUERA_DE_SERVICIO' });
      return;
    }
    next();
  });

  const cuentasDelCliente = async (identificacion: string) => {
    const cliente = await clientes.findOne({ identificacion });
    return cliente ? cuentas.find({ cliente_id: cliente._id, estado: { $ne: 'CERRADA' } }).toArray() : null;
  };

  app.get('/clientes/:identificacion/cuentas', async (req: Request<{ identificacion: string }>, res: Response) => {
    const lista = await cuentasDelCliente(req.params.identificacion);
    if (!lista) {
      res.status(404).json({ codigo: 'CLIENTE_NO_EXISTE' });
      return;
    }
    res.json(lista.map(aCuenta));
  });

  app.get('/clientes/:identificacion/cuentas/:uuid', async (req: Request<{ identificacion: string; uuid: string }>, res: Response) => {
    const cuenta = (await cuentasDelCliente(req.params.identificacion))?.find((c) => c.uuid === req.params.uuid);
    if (!cuenta) {
      res.status(404).json({ codigo: 'CUENTA_NO_EXISTE' });
      return;
    }
    res.json(aCuenta(cuenta));
  });

  const movimiento = (signo: 1 | -1) => async (req: Request, res: Response) => {
    const { referencia, cuentaId, monto } = req.body as { referencia?: string; cuentaId?: string; monto?: string };
    if (!referencia || !cuentaId || !monto || !(Number(monto) > 0)) {
      res.status(400).json({ codigo: 'SOLICITUD_INVALIDA' });
      return;
    }
    // Idempotencia: la referencia es única; si ya existe, el movimiento ya se aplicó.
    try {
      await movimientos.insertOne({ referencia, cuentaId, monto: Decimal128.fromString(monto), signo, fecha: new Date() });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        res.status(200).json({ referencia, aplicado: true, repetido: true });
        return;
      }
      throw error;
    }

    const importe = Decimal128.fromString(signo === 1 ? monto : `-${monto}`);
    const filtro = signo === -1
      ? { uuid: cuentaId, estado: 'ACTIVA', saldo: { $gte: Decimal128.fromString(monto) } }
      : { uuid: cuentaId, estado: 'ACTIVA' };
    const actualizada = await cuentas.findOneAndUpdate(filtro, { $inc: { saldo: importe } }, { returnDocument: 'after' });

    if (!actualizada) {
      await movimientos.deleteOne({ referencia });
      const existe = await cuentas.findOne({ uuid: cuentaId });
      const codigo = !existe || existe.estado !== 'ACTIVA' ? 'CUENTA_BLOQUEADA' : 'FONDOS_INSUFICIENTES';
      logger.info({ referencia, codigo }, 'Movimiento rechazado');
      res.status(422).json({ codigo });
      return;
    }
    logger.info({ referencia, cuentaId, monto, signo }, 'Movimiento aplicado');
    res.status(201).json({ referencia, aplicado: true, saldo: (actualizada.saldo as Decimal128).toString() });
  };

  app.post('/debitos', movimiento(-1));
  app.post('/creditos', movimiento(1));
  return app;
}
