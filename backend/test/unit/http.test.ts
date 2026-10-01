import { generateKeyPairSync, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService, scopesPara } from '../../src/application/services/auth.service.js';
import { SimulacionService } from '../../src/application/services/simulacion.service.js';
import type { Rol } from '../../src/application/ports/repositorios.js';
import { BcryptHasher } from '../../src/infrastructure/security/bcrypt.hasher.js';
import { JwtTokenService } from '../../src/infrastructure/security/jwt-token.service.js';
import { crearApiApp, crearAuthApp } from '../../src/presentation/http/app.js';
import { versionDeIfMatch } from '../../src/presentation/http/mappers/recursos.mapper.js';
import { problemaDe } from '../../src/presentation/http/problem.js';
import { codificarCursor, decodificarCursor } from '../../src/shared/paginacion.js';
import { CLIENTE, CUENTA, crearEntorno, OPERADOR } from '../fakes/entorno.js';
import { crearLogger } from '../../src/shared/logger.js';

const loggerSilencioso = crearLogger('test');

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const tokens = new JwtTokenService({ clavePrivada: privateKey, clavePublica: publicKey, emisor: 'auth', audiencia: 'api', ttlSegundos: 900 });
const bearer = (usuarioId: string, roles: Rol[], scope = scopesPara(roles).join(' ')) => `Bearer ${tokens.firmarAcceso({ sub: usuarioId, roles, scope })}`;

let e: ReturnType<typeof crearEntorno>;
let app: ReturnType<typeof crearApiApp>;
const cliente = () => bearer(CLIENTE.usuarioId, ['CLIENTE']);

beforeEach(() => {
  e = crearEntorno();
  app = crearApiApp({
    planes: e.planes,
    movimientosDinero: e.dinero,
    consultas: e.consultas,
    clientes: e.clientes,
    simulacion: new SimulacionService(e.reloj),
    tokens,
    idempotencia: e.uow.repos.idempotencia,
    reloj: e.reloj,
    logger: loggerSilencioso,
    estadoCore: () => 'CERRADO',
    rutaContrato: new URL('../../../contracts/openapi.yaml', import.meta.url).pathname,
  });
});

const PLAN = { nombre: 'Moto', icono: 'directions_car', montoMetaCentavos: 120000, fechaObjetivo: '2027-10-01', diaDebito: 15, cuentaDebitoId: CUENTA };

async function crearPlan(cuerpo: object = PLAN) {
  return request(app).post('/v1/planes-ahorro').set('Authorization', cliente()).set('Idempotency-Key', randomUUID()).send(cuerpo);
}

describe('endpoints públicos', () => {
  it('GET /v1/tarifas y /v1/simulaciones son anónimos y cacheables', async () => {
    const tarifas = await request(app).get('/v1/tarifas');
    expect(tarifas.status).toBe(200);
    expect(tarifas.headers['cache-control']).toBe('public, max-age=300');
    expect(tarifas.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    const sim = await request(app).get('/v1/simulaciones').query({ montoMetaCentavos: 120000, fechaObjetivo: '2027-10-01', bloqueado: 'true' });
    expect(sim.status).toBe(200);
    expect(sim.body).toMatchObject({ cuotaMensualCentavos: 9746, plazoMeses: 12 });
    expect(sim.headers.etag).toBeDefined();
  });

  it('valida la query y responde problem+json', async () => {
    const r = await request(app).get('/v1/simulaciones').query({ montoMetaCentavos: 0 });
    expect(r.status).toBe(400);
    expect(r.headers['content-type']).toContain('application/problem+json');
    expect(r.body).toMatchObject({ status: 400, codigo: 'VALIDACION' });
    expect(r.body.errores.map((x: { campo: string }) => x.campo)).toEqual(expect.arrayContaining(['montoMetaCentavos', 'fechaObjetivo']));
  });

  it('respeta el X-Request-Id recibido, expone /health y responde 404 a rutas inexistentes', async () => {
    const id = randomUUID();
    expect((await request(app).get('/v1/tarifas').set('X-Request-Id', id)).headers['x-request-id']).toBe(id);
    expect((await request(app).get('/health')).body).toEqual({ estado: 'OK', circuitoCore: 'CERRADO' });
    expect((await request(app).get('/v1/no-existe').set('Authorization', cliente())).body.codigo).toBe('NO_ENCONTRADO');
  });
});

describe('documentación', () => {
  it('publica el contrato OpenAPI y Swagger UI sin autenticación', async () => {
    const yaml = await request(app).get('/docs/openapi.yaml');
    expect(yaml.status).toBe(200);
    expect(yaml.headers['content-type']).toContain('application/yaml');
    expect(yaml.text).toContain('openapi: 3.1.0');
    const ui = await request(app).get('/docs/').redirects(1);
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
  });
});

describe('seguridad', () => {
  it('sin token, con token inválido o expirado responde 401 con WWW-Authenticate', async () => {
    expect((await request(app).get('/v1/planes-ahorro')).status).toBe(401);
    const malo = await request(app).get('/v1/planes-ahorro').set('Authorization', 'Bearer x.y.z');
    expect(malo.status).toBe(401);
    expect(malo.headers['www-authenticate']).toContain('invalid_token');
    const expirado = jwt.sign({ roles: ['CLIENTE'], scope: 'planes:leer', exp: Math.floor(Date.now() / 1000) - 10 }, privateKey, { algorithm: 'RS256', subject: 'x', issuer: 'auth', audience: 'api' });
    expect((await request(app).get('/v1/planes-ahorro').set('Authorization', `Bearer ${expirado}`)).body.detail).toBe('El token expiró.');
    const sinClaims = jwt.sign({}, privateKey, { algorithm: 'RS256', issuer: 'auth', audience: 'api', subject: 'x' });
    expect((await request(app).get('/v1/planes-ahorro').set('Authorization', `Bearer ${sinClaims}`)).status).toBe(401);
  });

  it('exige el scope de la operación (403)', async () => {
    const soloLectura = bearer(CLIENTE.usuarioId, ['CLIENTE'], 'planes:leer');
    const r = await request(app).post('/v1/planes-ahorro').set('Authorization', soloLectura).set('Idempotency-Key', randomUUID()).send(PLAN);
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ codigo: 'PERMISO_INSUFICIENTE', detail: 'Se requiere el scope planes:escribir.' });
    expect((await request(app).get('/v1/corridas-cobro').set('Authorization', cliente())).status).toBe(403);
  });

  it('un token sin clave privada no se puede firmar', () => {
    const soloVerifica = new JwtTokenService({ clavePublica: publicKey, emisor: 'auth', audiencia: 'api', ttlSegundos: 1 });
    expect(() => soloVerifica.firmarAcceso({ sub: 'x', roles: ['CLIENTE'], scope: '' })).toThrow(/clave privada/);
  });
});

describe('planes', () => {
  it('POST crea (201 + Location + ETag) y GET devuelve la forma del contrato', async () => {
    const r = await crearPlan();
    expect(r.status).toBe(201);
    expect(r.headers.location).toBe(`/v1/planes-ahorro/${r.body.id}`);
    expect(r.headers.etag).toBe('W/"v1"');
    expect(r.body).toMatchObject({ estado: 'ACTIVO', cuotaMensualCentavos: 9796, saldoDisponibleCentavos: 0, progreso: 0, proximoDebito: '2026-10-15' });
    expect(r.body).not.toHaveProperty('clienteId');
    expect(r.body).not.toHaveProperty('version');
    const get = await request(app).get(`/v1/planes-ahorro/${r.body.id}`).set('Authorization', cliente());
    expect(get.status).toBe(200);
    expect(get.body.id).toBe(r.body.id);
    // Datos privados: sin caché, para que el navegador no reutilice un saldo viejo (304).
    expect(get.headers['cache-control']).toBe('no-store');
  });

  it('Idempotency-Key: repite la respuesta original y rechaza otro cuerpo con 409', async () => {
    const clave = randomUUID();
    const enviar = (cuerpo: object) => request(app).post('/v1/planes-ahorro').set('Authorization', cliente()).set('Idempotency-Key', clave).send(cuerpo);
    const primera = await enviar(PLAN);
    await new Promise((r) => setTimeout(r, 10));
    const repetida = await enviar(PLAN);
    expect(repetida.status).toBe(201);
    expect(repetida.headers['idempotent-replayed']).toBe('true');
    expect(repetida.headers.location).toBe(primera.headers.location);
    expect(repetida.body.id).toBe(primera.body.id);
    expect(e.base.planes).toHaveLength(1);
    expect((await enviar({ ...PLAN, nombre: 'Otro' })).body.codigo).toBe('IDEMPOTENCIA_CONFLICTO');
    expect((await request(app).post('/v1/planes-ahorro').set('Authorization', cliente()).send(PLAN)).body.errores[0].campo).toBe('Idempotency-Key');
  });

  it('valida el cuerpo, el JSON y el planId', async () => {
    expect((await crearPlan({ ...PLAN, diaDebito: 31, extra: 1 })).body.codigo).toBe('VALIDACION');
    const roto = await request(app).post('/v1/planes-ahorro').set('Authorization', cliente()).set('Idempotency-Key', randomUUID()).set('content-type', 'application/json').send('{malo');
    expect(roto.status).toBe(400);
    expect((await request(app).get('/v1/planes-ahorro/no-es-uuid').set('Authorization', cliente())).status).toBe(400);
  });

  it('lista con filtros, orden y resumen', async () => {
    await crearPlan();
    await crearPlan({ ...PLAN, nombre: 'Casa', montoMetaCentavos: 900000 });
    const r = await request(app).get('/v1/planes-ahorro').query({ estado: 'ACTIVO,COMPLETADO', orden: '-montoMetaCentavos', limite: 1, bloqueado: 'false' }).set('Authorization', cliente());
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ pagina: 1, limite: 1, totalElementos: 2, totalPaginas: 2, resumen: { cantidadPlanes: 2, totalMetaCentavos: 1020000 } });
    expect(r.body.items[0].nombre).toBe('Casa');
    expect((await request(app).get('/v1/planes-ahorro').query({ estado: 'OTRO' }).set('Authorization', cliente())).status).toBe(400);
  });

  it('PATCH exige merge-patch+json y controla la versión con If-Match', async () => {
    const { body: plan } = await crearPlan();
    const url = `/v1/planes-ahorro/${plan.id}`;
    expect((await request(app).patch(url).set('Authorization', cliente()).send({ nombre: 'X' })).status).toBe(415);
    const parche = (ifMatch?: string) => {
      const r = request(app).patch(url).set('Authorization', cliente()).set('Content-Type', 'application/merge-patch+json');
      return (ifMatch ? r.set('If-Match', ifMatch) : r).send(JSON.stringify({ diaDebito: 5 }));
    };
    const ok = await parche('W/"v1"');
    expect(ok.status).toBe(200);
    expect(ok.headers.etag).toBe('W/"v2"');
    expect((await parche('W/"v1"')).status).toBe(412);
    expect((await parche()).status).toBe(200);
    expect(versionDeIfMatch('cualquiera')).toBe(-1);
  });

  it('bloqueo, desbloqueo, cancelación y conflictos de estado (409)', async () => {
    const { body: plan } = await crearPlan();
    const base = `/v1/planes-ahorro/${plan.id}`;
    expect((await request(app).post(`${base}/bloqueo`).set('Authorization', cliente())).body.bloqueado).toBe(true);
    expect((await request(app).post(`${base}/bloqueo`).set('Authorization', cliente())).body.codigo).toBe('PLAN_YA_BLOQUEADO');
    const desb = await request(app).post(`${base}/desbloqueo`).set('Authorization', cliente()).set('Idempotency-Key', randomUUID());
    expect(desb.body).toMatchObject({ plan: { bloqueado: false }, interesesPerdidosCentavos: 0 });
    const canc = await request(app).post(`${base}/cancelacion`).set('Authorization', cliente()).set('Idempotency-Key', randomUUID()).send({});
    expect(canc.body).toMatchObject({ plan: { estado: 'CANCELADO', proximoDebito: null }, estadoDevolucion: 'EJECUTADO', cuentaDestino: { id: CUENTA } });
    const aporte = await request(app).post(`${base}/aportes`).set('Authorization', cliente()).set('Idempotency-Key', randomUUID()).send({ montoCentavos: 100 });
    expect(aporte.status).toBe(409);
    expect(aporte.body.codigo).toBe('ESTADO_INVALIDO');
  });
});

describe('aportes, retiros, cuotas, movimientos y corridas', () => {
  it('aporte 202 + Location; retiro 202; consultas', async () => {
    const { body: plan } = await crearPlan();
    const base = `/v1/planes-ahorro/${plan.id}`;
    const aporte = await request(app).post(`${base}/aportes`).set('Authorization', cliente()).set('Idempotency-Key', randomUUID()).send({ montoCentavos: 5000 });
    expect(aporte.status).toBe(202);
    expect(aporte.headers.location).toBe(`${base}/aportes/${aporte.body.id}`);
    expect(aporte.body).toMatchObject({ estado: 'PENDIENTE', cuentaOrigen: { id: CUENTA } });
    await e.procesarOutbox();
    expect((await request(app).get(aporte.headers.location as string).set('Authorization', cliente())).body.estado).toBe('EJECUTADO');

    const retiro = await request(app).post(`${base}/retiros`).set('Authorization', cliente()).set('Idempotency-Key', randomUUID()).send({ montoCentavos: 1000, cuentaDestinoId: CUENTA });
    expect(retiro.status).toBe(202);
    expect(retiro.body.cuentaDestino.id).toBe(CUENTA);
    expect((await request(app).get(retiro.headers.location as string).set('Authorization', cliente())).status).toBe(200);
    const excedido = await request(app).post(`${base}/retiros`).set('Authorization', cliente()).set('Idempotency-Key', randomUUID()).send({ montoCentavos: 999999 });
    expect(excedido.body.codigo).toBe('SALDO_INSUFICIENTE');

    const cuotas = await request(app).get(`${base}/cuotas`).query({ estado: 'PROGRAMADA', limite: 2 }).set('Authorization', cliente());
    expect(cuotas.body).toMatchObject({ totalElementos: 12, limite: 2 });
    expect(cuotas.body.items[0]).toMatchObject({ numero: 1, moneda: 'USD' });
    expect(cuotas.body.items[0]).not.toHaveProperty('planId');

    const movs = await request(app).get(`${base}/movimientos`).query({ limite: 1, tipo: 'APORTE_MANUAL', desde: '2026-01-01', hasta: '2027-01-01' }).set('Authorization', cliente());
    expect(movs.body).toMatchObject({ hayMas: false, siguienteCursor: null });
    expect(movs.body.items[0]).toMatchObject({ tipo: 'APORTE_MANUAL', montoCentavos: 5000 });

    await e.corte.ejecutar('2026-10-15');
    const operador = bearer(OPERADOR.usuarioId, ['OPERADOR']);
    const corridas = await request(app).get('/v1/corridas-cobro').query({ estado: 'COMPLETADA' }).set('Authorization', operador);
    expect(corridas.body.totalElementos).toBe(1);
    expect((await request(app).get(`/v1/corridas-cobro/${corridas.body.items[0].id}`).set('Authorization', operador)).status).toBe(200);
  });

  it('perfil y cuentas del cliente', async () => {
    expect((await request(app).get('/v1/clientes/me').set('Authorization', cliente())).body.nombre).toBe('Pablo Jara');
    expect((await request(app).get('/v1/cuentas-debito').set('Authorization', cliente())).body.items).toHaveLength(2);
  });

  it('un error inesperado responde 500 sin filtrar detalles', async () => {
    e.uow.repos.planes.listar = () => Promise.reject(new Error('detalle interno'));
    const r = await request(app).get('/v1/planes-ahorro').set('Authorization', cliente());
    expect(r.status).toBe(500);
    expect(r.body.codigo).toBe('ERROR_INTERNO');
    expect(JSON.stringify(r.body)).not.toContain('detalle interno');
  });
});

describe('Servicio de Autenticación', () => {
  async function entornoAuth() {
    const ent = crearEntorno();
    const hasher = new BcryptHasher(4);
    ent.base.usuarios[0]!.hashContrasena = await hasher.hash('goallet123');
    const auth = new AuthService(ent.uow, hasher, tokens, ent.reloj, 7);
    return { ent, auth, app: crearAuthApp(auth, loggerSilencioso) };
  }

  it('emite tokens con la contraseña y rota el refresh token', async () => {
    const { app: authApp } = await entornoAuth();
    const login = await request(authApp).post('/v1/auth/token').send({ grantType: 'password', email: 'PABLO@test.com', contrasena: 'goallet123' });
    expect(login.status).toBe(200);
    expect(login.headers['cache-control']).toBe('no-store');
    expect(login.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
    expect(login.body.scope).toContain('retiros:escribir');
    expect(tokens.verificarAcceso(login.body.accessToken).sub).toBe(CLIENTE.usuarioId);

    const renovado = await request(authApp).post('/v1/auth/token').send({ grantType: 'refresh_token', refreshToken: login.body.refreshToken });
    expect(renovado.status).toBe(200);
    expect(renovado.body.refreshToken).not.toBe(login.body.refreshToken);
    const reutilizado = await request(authApp).post('/v1/auth/token').send({ grantType: 'refresh_token', refreshToken: login.body.refreshToken });
    expect(reutilizado.status).toBe(401);
  });

  it('rechaza credenciales inválidas, usuarios inexistentes, refresh vencidos y cuerpos inválidos', async () => {
    const { app: authApp, ent, auth } = await entornoAuth();
    expect((await request(authApp).post('/v1/auth/token').send({ grantType: 'password', email: 'pablo@test.com', contrasena: 'incorrecta' })).body.codigo).toBe('CREDENCIALES_INVALIDAS');
    expect((await request(authApp).post('/v1/auth/token').send({ grantType: 'password', email: 'nadie@test.com', contrasena: 'goallet123' })).status).toBe(401);
    expect((await request(authApp).post('/v1/auth/token').send({ grantType: 'otro' })).status).toBe(400);
    expect((await request(authApp).get('/health')).body.estado).toBe('OK');
    const { refreshToken } = await auth.conContrasena('pablo@test.com', 'goallet123');
    ent.reloj.avanzar(8 * 86_400_000);
    await expect(auth.conRefreshToken(refreshToken)).rejects.toMatchObject({ codigo: 'CREDENCIALES_INVALIDAS' });
    await expect(auth.conRefreshToken('rt_inexistente')).rejects.toMatchObject({ codigo: 'CREDENCIALES_INVALIDAS' });
  });

  it('scopes por rol y combinación de roles', () => {
    expect(scopesPara(['OPERADOR'])).toEqual(['planes:leer', 'corridas:leer']);
    expect(scopesPara(['OPERADOR', 'AUDITOR'])).toEqual(['planes:leer', 'corridas:leer', 'movimientos:leer']);
  });
});

describe('utilidades de presentación', () => {
  it('problem details y cursores', () => {
    expect(problemaDe('CORE_NO_DISPONIBLE')).toMatchObject({ status: 503, type: expect.stringContaining('core-no-disponible') });
    expect(decodificarCursor(codificarCursor({ fecha: 'f', id: 'i' }))).toEqual({ fecha: 'f', id: 'i' });
    expect(() => decodificarCursor(Buffer.from('{"fecha":1}').toString('base64url'))).toThrow();
  });
});
