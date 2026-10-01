import { Decimal128, ObjectId, type Db } from 'mongodb';

/**
 * Datos del Core simulado con el modelo de Carina (bdd/1. CORE-BANCARIO...):
 * colecciones `clientes` y `cuentas`, saldos en Decimal128. A cada cuenta se le
 * agrega un `uuid` público (el contrato expone ids UUID) y un `alias`.
 * Pablo Jara es el cliente del frontend; Carlos y María vienen del script de Carina.
 */
const CLIENTES = [
  {
    identificacion: '1712345678',
    primer_nombre: 'Pablo',
    primer_apellido: 'Jara',
    fecha_nacimiento: new Date('1994-06-12'),
    email: 'pablo.jara@email.com',
    cuentas: [
      { uuid: '0c6f2a9e-1b3d-4e5f-8a7b-6c5d4e3f2a1b', alias: 'pablo.ahorros', numero_cuenta: '0070128901', tipo_cuenta: 'AHORROS', saldo: '4528.30' },
      { uuid: '1d7a3b0f-2c4e-4f60-9b8c-7d6e5f4a3b2c', alias: 'pablo.negocios', numero_cuenta: '0070125432', tipo_cuenta: 'CORRIENTE', saldo: '1184.50' },
      { uuid: '2e8b4c1a-3d5f-4a71-8c9d-8e7f6a5b4c3d', alias: 'pablo.viajes', numero_cuenta: '0070123344', tipo_cuenta: 'AHORROS', saldo: '2340.50' },
    ],
  },
  {
    identificacion: '1720458932',
    primer_nombre: 'Carlos',
    primer_apellido: 'Mendoza',
    fecha_nacimiento: new Date('1988-03-22'),
    email: 'carlos.mendoza@email.com',
    cuentas: [{ uuid: '3f9c5d2b-4e6a-4b82-9dae-9f8a7b6c5d4e', alias: 'carlos.ahorros', numero_cuenta: '2200145890', tipo_cuenta: 'AHORROS', saldo: '2500.00' }],
  },
  {
    identificacion: '0918273645',
    primer_nombre: 'María',
    primer_apellido: 'Vargas',
    fecha_nacimiento: new Date('1995-11-05'),
    email: 'maria.vargas@email.com',
    cuentas: [{ uuid: '4a0d6e3c-5f7b-4c93-8ebf-0a9b8c7d6e5f', alias: 'maria.corriente', numero_cuenta: '1100987654', tipo_cuenta: 'CORRIENTE', saldo: '800.00' }],
  },
];

/**
 * Completa en la base compartida (MongoDB Atlas del equipo) lo que el Core simulado
 * necesita, sin borrar ni sobrescribir datos existentes: crea los clientes y cuentas
 * que falten (por identificación y número de cuenta) y, a las cuentas existentes sin
 * `uuid`, les agrega el identificador público. Devuelve cuántos documentos cambió.
 */
export async function asegurarDatosDePrueba(db: Db): Promise<number> {
  let cambios = 0;
  for (const c of CLIENTES) {
    const existente = await db.collection('clientes').findOne({ identificacion: c.identificacion });
    const clienteId = existente?._id ?? new ObjectId();
    if (!existente) {
      await db.collection('clientes').insertOne({
        _id: clienteId,
        identificacion: c.identificacion,
        primer_nombre: c.primer_nombre,
        primer_apellido: c.primer_apellido,
        fecha_nacimiento: c.fecha_nacimiento,
        estado: 'ACTIVO',
        contactos: [{ tipo_contacto: 'EMAIL', valor: c.email, es_principal: true }],
        creado_en: new Date(),
      });
      cambios++;
    }
    for (const cuenta of c.cuentas) {
      const actual = await db.collection('cuentas').findOne({ numero_cuenta: cuenta.numero_cuenta });
      if (!actual) {
        await db.collection('cuentas').insertOne({
          cliente_id: clienteId,
          uuid: cuenta.uuid,
          alias: cuenta.alias,
          numero_cuenta: cuenta.numero_cuenta,
          tipo_cuenta: cuenta.tipo_cuenta,
          saldo: Decimal128.fromString(cuenta.saldo),
          estado: 'ACTIVA',
          creado_en: new Date(),
        });
        cambios++;
      } else if (!actual.uuid) {
        await db.collection('cuentas').updateOne({ _id: actual._id }, { $set: { uuid: cuenta.uuid, alias: actual.alias ?? cuenta.alias } });
        cambios++;
      }
    }
  }
  await crearIndices(db);
  return cambios;
}

async function crearIndices(db: Db): Promise<void> {
  // Parcial: las cuentas que otros cargaron sin uuid no chocan entre sí.
  await db.collection('cuentas').createIndex({ uuid: 1 }, { unique: true, partialFilterExpression: { uuid: { $type: 'string' } }, name: 'uk_cuenta_uuid' });
  await db.collection('movimientos_cuentas').createIndex({ referencia: 1 }, { unique: true, name: 'uk_movimiento_referencia' });
}

/** Usuarios sintéticos para las pruebas de carga (k6): mismo uuid que en la semilla de PostgreSQL. */
export async function sembrarClientesDeCarga(db: Db, cuentas: { identificacion: string; uuid: string }[]): Promise<void> {
  for (const c of cuentas) {
    const existe = await db.collection('clientes').findOne({ identificacion: c.identificacion });
    if (existe) continue;
    const clienteId = new ObjectId();
    await db.collection('clientes').insertOne({
      _id: clienteId,
      identificacion: c.identificacion,
      primer_nombre: 'Carga',
      primer_apellido: c.identificacion,
      fecha_nacimiento: new Date('1990-01-01'),
      estado: 'ACTIVO',
      contactos: [],
      creado_en: new Date(),
    });
    await db.collection('cuentas').insertOne({
      cliente_id: clienteId,
      uuid: c.uuid,
      alias: `carga.${c.identificacion}`,
      numero_cuenta: c.identificacion.padStart(10, '0'),
      tipo_cuenta: 'AHORROS',
      saldo: Decimal128.fromString('1000000.00'),
      estado: 'ACTIVA',
      creado_en: new Date(),
    });
  }
}
