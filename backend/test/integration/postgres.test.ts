import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ClientesService } from '../../src/application/services/clientes.service.js';
import { ConsultasService } from '../../src/application/services/consultas.service.js';
import { CorteDebitosService } from '../../src/application/services/corte-debitos.service.js';
import { EjecutorCoreService } from '../../src/application/services/ejecutor-core.service.js';
import { MovimientosDineroService } from '../../src/application/services/movimientos-dinero.service.js';
import { PlanesService } from '../../src/application/services/planes.service.js';
import { ResultadosCoreService } from '../../src/application/services/resultados-core.service.js';
import type { CreditoSolicitado, DebitoSolicitado, Evento } from '../../src/domain/eventos.js';
import { CoreSimuladoAdapter } from '../../src/infrastructure/core/core-simulado.adapter.js';
import { OutboxRelay } from '../../src/infrastructure/messaging/outbox-relay.js';
import { PgUnitOfWork } from '../../src/infrastructure/postgres/pg-unit-of-work.js';
import { crearPool, migrar, type Pool } from '../../src/infrastructure/postgres/pool.js';
import { CLIENTE, CUENTA, CUENTA_POBRE, OPERADOR, OTRO_CLIENTE, PLAN_BASE } from '../fakes/entorno.js';
import { IdsReales, loggerSilencioso, RelojFijo } from '../fakes/memoria.js';

const URL_ADMIN = process.env.DATABASE_URL_ADMIN ?? 'postgres://billetera:billetera@localhost:5432/billetera';
const BASE_PRUEBA = 'billetera_test';

let pool: Pool;

beforeAll(async () => {
  const admin = crearPool(URL_ADMIN, 1);
  await admin.query(`DROP DATABASE IF EXISTS ${BASE_PRUEBA} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${BASE_PRUEBA}`);
  await admin.end();
  pool = crearPool(URL_ADMIN.replace(/\/[^/]+$/, `/${BASE_PRUEBA}`), 10);
  await migrar(pool);
  await pool.query(
    `INSERT INTO usuarios (id, nombre, email, hash_contrasena, roles, core_cliente_id) VALUES
       ($1, 'Pablo Jara', 'pablo@test.com', 'x', ARRAY['CLIENTE'], '1712345678'),
       ($2, 'Otro', 'otro@test.com', 'x', ARRAY['CLIENTE'], NULL),
       ($3, 'Operador', 'op@test.com', 'x', ARRAY['OPERADOR'], NULL)`,
    [CLIENTE.usuarioId, OTRO_CLIENTE.usuarioId, OPERADOR.usuarioId],
  );
});

afterAll(async () => {
  await pool?.end();
});

beforeEach(async () => {
  await pool.query('TRUNCATE planes, cuotas, operaciones_core, movimientos, outbox, corridas_cobro, eventos_procesados, idempotencia, refresh_tokens CASCADE');
});

function entorno() {
  const uow = new PgUnitOfWork(pool);
  const reloj = new RelojFijo();
  const ids = new IdsReales();
  const core = new CoreSimuladoAdapter([
    { id: CUENTA, clienteCoreId: '1712345678', numeroEnmascarado: '******8901', tipo: 'AHORROS', moneda: 'USD', saldoDisponibleCentavos: 1_000_000 },
    { id: CUENTA_POBRE, clienteCoreId: '1712345678', numeroEnmascarado: '******5432', tipo: 'CORRIENTE', moneda: 'USD', saldoDisponibleCentavos: 100 },
  ]);
  const clientes = new ClientesService(uow, core);
  const ejecutor = new EjecutorCoreService(core, ids, reloj, loggerSilencioso);
  const resultados = new ResultadosCoreService(uow, reloj, ids, loggerSilencioso);
  return {
    uow,
    reloj,
    core,
    planes: new PlanesService(uow, clientes, reloj, ids),
    dinero: new MovimientosDineroService(uow, clientes, reloj, ids),
    consultas: new ConsultasService(uow),
    corte: new CorteDebitosService(uow, reloj, ids, loggerSilencioso),
    resultados,
    /** Publica la outbox real hacia un "broker" en memoria que ejecuta contra el Core y procesa el resultado. */
    async procesarOutbox() {
      const publicados: Evento[] = [];
      const relay = new OutboxRelay(pool, { publicar: async (e) => void publicados.push(e) }, loggerSilencioso);
      while ((await relay.publicarPendientes()) > 0);
      for (const evento of publicados.filter((e) => e.tipo.endsWith('Solicitado'))) {
        await resultados.procesar(await ejecutor.ejecutar(evento as DebitoSolicitado | CreditoSolicitado));
      }
      return publicados;
    },
  };
}

describe('PostgreSQL: flujo completo con transacciones, ledger y outbox', () => {
  it('crea, aporta, retira, bloquea, desbloquea y cancela con saldos derivados del ledger', async () => {
    const e = entorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    expect(plan).toMatchObject({ estado: 'ACTIVO', saldoCentavos: 0, version: 1, cuotaMensualCentavos: 9796 });
    expect((await e.procesarOutbox()).map((x) => x.tipo)).toEqual(['PlanCreado']);

    await e.dinero.solicitarAporte(CLIENTE, plan.id, 10_000);
    await e.procesarOutbox();
    e.reloj.avanzar(1000);
    const retiro = await e.dinero.solicitarRetiro(CLIENTE, plan.id, 3_000, CUENTA);
    expect((await e.planes.obtener(CLIENTE, plan.id)).reservadoCentavos).toBe(3_000);
    await e.procesarOutbox();
    expect((await e.dinero.obtenerRetiro(CLIENTE, plan.id, retiro.id)).estado).toBe('EJECUTADO');

    await e.planes.bloquear(CLIENTE, plan.id);
    e.reloj.avanzar(1000);
    await e.uow.repos.movimientos.asentar({ id: crypto.randomUUID(), planId: plan.id, tipo: 'INTERES', montoCentavos: 120, moneda: 'USD', fecha: e.reloj.ahora().toISOString(), descripcion: 'i', origen: 'Rendimiento', referencia: { tipo: 'CUOTA', id: crypto.randomUUID() }, correlationId: null });
    e.reloj.avanzar(1000);
    const { interesesPerdidosCentavos } = await e.planes.desbloquear(CLIENTE, plan.id);
    expect(interesesPerdidosCentavos).toBe(120);
    e.reloj.avanzar(1000);

    const cancelacion = await e.planes.cancelar(CLIENTE, plan.id);
    expect(cancelacion).toMatchObject({ montoDevueltoCentavos: 7_000, estadoDevolucion: 'PENDIENTE' });
    e.reloj.avanzar(1000);
    await e.procesarOutbox();
    const final = await e.planes.obtener(CLIENTE, plan.id);
    expect(final).toMatchObject({ estado: 'CANCELADO', saldoCentavos: 0, interesesDevengadosCentavos: 0, version: 4 });
    expect(e.core.saldoDe(CUENTA)).toBe(1_000_000);

    const movs = await e.consultas.movimientos(CLIENTE, plan.id, { limite: 10, tipos: ['APORTE_MANUAL', 'RETIRO', 'INTERES', 'PENALIDAD', 'DEVOLUCION'], desde: '2020-01-01', hasta: '2100-01-01' });
    expect(movs.items.map((m) => [m.tipo, m.saldoResultanteCentavos])).toEqual([
      ['DEVOLUCION', 0],
      ['PENALIDAD', 7_000],
      ['INTERES', 7_120],
      ['RETIRO', 7_000],
      ['APORTE_MANUAL', 10_000],
    ]);
    expect(movs.items[2]?.referencia?.tipo).toBe('CUOTA');
  });

  it('el ledger es de solo inserción (el trigger rechaza UPDATE y DELETE)', async () => {
    const e = entorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    await e.dinero.solicitarAporte(CLIENTE, plan.id, 500);
    await e.procesarOutbox();
    await expect(pool.query('UPDATE movimientos SET monto_centavos = 1')).rejects.toThrow(/solo inserción/);
    await expect(pool.query('DELETE FROM movimientos')).rejects.toThrow(/solo inserción/);
  });

  it('si la transacción falla no queda ni el cambio ni el evento (rollback)', async () => {
    const e = entorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    await expect(
      e.uow.ejecutar(async (repos) => {
        await repos.outbox.agregar({ id: crypto.randomUUID(), tipo: 'X', correlationId: crypto.randomUUID(), ocurridoEn: '', datos: {} });
        await repos.planes.actualizar({ ...plan, nombre: 'cambiado' });
        throw new Error('falla a mitad');
      }),
    ).rejects.toThrow('falla a mitad');
    expect((await e.planes.obtener(CLIENTE, plan.id)).nombre).toBe('Moto');
    expect((await pool.query("SELECT count(*)::int AS n FROM outbox WHERE tipo = 'X'")).rows[0].n).toBe(0);
  });

  it('listar: filtros, orden por progreso y resumen sobre todos los planes', async () => {
    const e = entorno();
    const a = await e.planes.crear(CLIENTE, PLAN_BASE);
    const b = await e.planes.crear(CLIENTE, { ...PLAN_BASE, nombre: 'Casa', montoMetaCentavos: 50_000, bloqueado: true });
    await e.dinero.solicitarAporte(CLIENTE, b.id, 25_000);
    await e.procesarOutbox();
    for (const orden of ['creadoEn', '-creadoEn', 'progreso', 'montoMetaCentavos', '-montoMetaCentavos'] as const) {
      expect((await e.planes.listar(CLIENTE, { orden, pagina: 1, limite: 10 })).items).toHaveLength(2);
    }
    const porProgreso = await e.planes.listar(CLIENTE, { orden: '-progreso', pagina: 1, limite: 1 });
    expect(porProgreso.items[0]?.id).toBe(b.id);
    expect(porProgreso.resumen).toMatchObject({ totalAhorradoCentavos: 25_000, totalMetaCentavos: 170_000, cantidadPlanes: 2, planesActivos: 2 });
    expect((await e.planes.listar(CLIENTE, { estados: ['ACTIVO'], bloqueado: false, orden: '-creadoEn', pagina: 1, limite: 10 })).items.map((p) => p.id)).toEqual([a.id]);
    expect((await e.planes.listar(OPERADOR, { clienteId: CLIENTE.usuarioId, orden: '-creadoEn', pagina: 2, limite: 1 })).items).toHaveLength(1);
    expect((await e.planes.listar(OTRO_CLIENTE, { orden: '-creadoEn', pagina: 1, limite: 10 })).resumen.cantidadPlanes).toBe(0);
  });

  it('modificar reprograma cuotas y respeta la versión', async () => {
    const e = entorno();
    const plan = await e.planes.crear(CLIENTE, PLAN_BASE);
    const mod = await e.planes.modificar(CLIENTE, plan.id, { diaDebito: 3, objetivo: 'Comprar moto' }, 1);
    expect(mod).toMatchObject({ diaDebito: 3, objetivo: 'Comprar moto', version: 2, fechaFinEstimada: '2027-09-03' });
    const cuotas = await e.consultas.cuotas(CLIENTE, plan.id, ['PROGRAMADA'], 1, 2);
    expect(cuotas.items.map((c) => c.fechaProgramada)).toEqual(['2026-10-03', '2026-11-03']);
    expect((await e.consultas.cuotas(CLIENTE, plan.id, undefined, 3, 5)).items).toHaveLength(2);
  });

  it('corte diario: el SP selecciona cuotas y reintentos; rechazos, prórroga y corridas', async () => {
    const e = entorno();
    const ok = await e.planes.crear(CLIENTE, PLAN_BASE);
    const pobre = await e.planes.crear(CLIENTE, { ...PLAN_BASE, nombre: 'Pobre', cuentaDebitoId: CUENTA_POBRE });
    await e.dinero.solicitarAporte(CLIENTE, ok.id, 50_000);
    await e.procesarOutbox();

    const corrida = await e.corte.ejecutar('2026-10-15');
    expect(corrida.totalCuotas).toBe(2);
    await e.procesarOutbox();
    expect(await e.consultas.corrida(corrida.id)).toMatchObject({ estado: 'COMPLETADA', ejecutadas: 1, rechazadas: 1, reprogramadas: 1 });
    expect((await e.consultas.movimientos(CLIENTE, ok.id, { limite: 5, tipos: ['INTERES'] })).items[0]?.montoCentavos).toBe(188);

    // Sin pasar 24 h el reintento no se selecciona.
    expect((await e.corte.ejecutar('2026-10-15')).totalCuotas).toBe(0);
    for (let i = 0; i < 4; i++) {
      e.reloj.avanzar(25 * 3_600_000);
      await e.corte.ejecutar('2026-10-15');
      await e.procesarOutbox();
    }
    expect(await e.planes.obtener(CLIENTE, pobre.id)).toMatchObject({ plazoMeses: 13, prorrogasMeses: 1, fechaFinEstimada: '2027-10-15' });
    expect((await e.consultas.cuotas(CLIENTE, pobre.id, ['CANCELADA'], 1, 10)).totalElementos).toBe(1);

    const listado = await e.consultas.corridas({ desde: '2026-10-15', hasta: '2026-10-15', estado: 'COMPLETADA' }, 1, 2);
    expect(listado).toMatchObject({ totalElementos: 6, totalPaginas: 3 });
  });

  it('completar el plan liquida los fondos; operaciones y eventos repetidos se ignoran', async () => {
    const e = entorno();
    const plan = await e.planes.crear(CLIENTE, { ...PLAN_BASE, montoMetaCentavos: 5_000 });
    const aporte = await e.dinero.solicitarAporte(CLIENTE, plan.id, 5_000);
    await e.procesarOutbox();
    expect((await e.planes.obtener(CLIENTE, plan.id)).estado).toBe('COMPLETADO');
    expect((await e.dinero.obtenerAporte(CLIENTE, plan.id, aporte.id)).procesadoEn).not.toBeNull();
    await e.procesarOutbox();
    expect((await e.planes.obtener(CLIENTE, plan.id)).saldoCentavos).toBe(0);
    expect(await e.uow.repos.eventosProcesados.registrarSiNuevo(crypto.randomUUID(), 'x')).toBe(true);
  });
});

describe('PostgreSQL: autenticación, idempotencia y outbox', () => {
  it('refresh tokens y usuarios', async () => {
    const repos = new PgUnitOfWork(pool).repos;
    expect((await repos.usuarios.buscarPorEmail('PABLO@test.com'))?.roles).toEqual(['CLIENTE']);
    expect(await repos.usuarios.buscarPorId(crypto.randomUUID())).toBeNull();
    await repos.refreshTokens.guardar({ hash: 'h1', usuarioId: CLIENTE.usuarioId, expiraEn: '2030-01-01T00:00:00.000Z' });
    expect(await repos.refreshTokens.buscar('h1')).toMatchObject({ usuarioId: CLIENTE.usuarioId, revocadoEn: null });
    expect(await repos.refreshTokens.revocar('h1', '2026-10-01T00:00:00.000Z')).toBe(true);
    expect(await repos.refreshTokens.revocar('h1', '2026-10-01T00:00:00.000Z')).toBe(false);
    expect(await repos.refreshTokens.buscar('nada')).toBeNull();
  });

  it('respuestas idempotentes se guardan y se reemplazan', async () => {
    const repo = new PgUnitOfWork(pool).repos.idempotencia;
    const r = { clave: 'k', usuarioId: CLIENTE.usuarioId, operacion: 'POST /x', hashCuerpo: 'h', status: 201, cuerpo: { a: 1 }, headers: { location: '/x/1' } };
    await repo.guardar(r);
    await repo.guardar({ ...r, status: 202 });
    expect(await repo.buscar('k', CLIENTE.usuarioId, 'POST /x')).toMatchObject({ status: 202, cuerpo: { a: 1 }, headers: { location: '/x/1' } });
    expect(await repo.buscar('k', CLIENTE.usuarioId, 'POST /y')).toBeNull();
  });

  it('el relay deja el evento pendiente si el broker falla', async () => {
    const e = entorno();
    await e.planes.crear(CLIENTE, PLAN_BASE);
    const fallido = new OutboxRelay(pool, { publicar: () => Promise.reject(new Error('broker caído')) }, loggerSilencioso);
    expect(await fallido.publicarPendientes()).toBe(0);
    const { rows } = await pool.query('SELECT intentos, publicado_en FROM outbox');
    expect(rows[0]).toMatchObject({ intentos: 1, publicado_en: null });
    const ok = new OutboxRelay(pool, { publicar: async () => undefined }, loggerSilencioso);
    ok.iniciar(10);
    await new Promise((r) => setTimeout(r, 100));
    ok.detener();
    expect((await pool.query('SELECT count(*)::int AS n FROM outbox WHERE publicado_en IS NULL')).rows[0].n).toBe(0);
  });
});
