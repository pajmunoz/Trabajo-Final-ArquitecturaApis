// Utilidades compartidas por las pruebas de carga (k6).
import http from 'k6/http';
import { check, fail, sleep } from 'k6';

export const BASE = __ENV.BASE_URL || 'http://3.151.57.252';
const EMAIL = __ENV.EMAIL || 'pablo.jara@email.com';
const CONTRASENA = __ENV.CONTRASENA || 'goallet123';
const CUENTA = '0c6f2a9e-1b3d-4e5f-8a7b-6c5d4e3f2a1b';

const json = { 'Content-Type': 'application/json' };

/** Inicia sesión una vez y prepara planes de prueba (se ejecuta antes de la carga). */
export function preparar(cantidadPlanes = 10) {
  const login = http.post(`${BASE}/v1/auth/token`, JSON.stringify({ grantType: 'password', email: EMAIL, contrasena: CONTRASENA }), {
    headers: json,
    tags: { name: 'POST /v1/auth/token' },
  });
  if (login.status !== 200) fail(`No se pudo iniciar sesión: ${login.status} ${login.body}`);
  const token = login.json('accessToken');
  const auth = { ...json, Authorization: `Bearer ${token}` };

  const planes = [];
  for (let i = 0; i < cantidadPlanes; i++) {
    const r = http.post(
      `${BASE}/v1/planes-ahorro`,
      JSON.stringify({
        nombre: `Carga ${i + 1}`,
        icono: 'savings',
        montoMetaCentavos: 50_000_000 + i * 1000,
        fechaObjetivo: fechaEnMeses(12 + i),
        diaDebito: 1 + (i % 28),
        cuentaDebitoId: CUENTA,
      }),
      { headers: { ...auth, 'Idempotency-Key': crypto.randomUUID() }, tags: { name: 'POST /v1/planes-ahorro' } },
    );
    if (r.status !== 201) fail(`No se pudo crear el plan: ${r.status} ${r.body}`);
    planes.push(r.json('id'));
  }
  return { token, planes };
}

export function fechaEnMeses(meses) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString().slice(0, 10);
}

const elegir = (lista) => lista[Math.floor(Math.random() * lista.length)];

/**
 * Una "sesión" de cliente autenticado con la mezcla de operaciones del producto.
 * Pesos: lecturas (planes, detalle, movimientos, cuotas) 80 %, cuentas en el Core
 * (camino síncrono hacia MongoDB Atlas) 12 %, aportes (escritura asíncrona) 8 %.
 */
export function sesionCliente(datos, pausa = 1) {
  const auth = { Authorization: `Bearer ${datos.token}` };
  const plan = elegir(datos.planes);
  const p = Math.random() * 100;
  let r;

  if (p < 30) {
    r = http.get(`${BASE}/v1/planes-ahorro?limite=10&estado=ACTIVO`, { headers: auth, tags: { name: 'GET /v1/planes-ahorro' } });
  } else if (p < 50) {
    r = http.get(`${BASE}/v1/planes-ahorro/${plan}`, { headers: auth, tags: { name: 'GET /v1/planes-ahorro/{id}' } });
  } else if (p < 68) {
    r = http.get(`${BASE}/v1/planes-ahorro/${plan}/movimientos?limite=20`, { headers: auth, tags: { name: 'GET .../movimientos' } });
  } else if (p < 80) {
    r = http.get(`${BASE}/v1/planes-ahorro/${plan}/cuotas?limite=12`, { headers: auth, tags: { name: 'GET .../cuotas' } });
  } else if (p < 92) {
    r = http.get(`${BASE}/v1/cuentas-debito`, { headers: auth, tags: { name: 'GET /v1/cuentas-debito' } });
  } else {
    r = http.post(`${BASE}/v1/planes-ahorro/${plan}/aportes`, JSON.stringify({ montoCentavos: 100 }), {
      headers: { ...auth, ...json, 'Idempotency-Key': crypto.randomUUID() },
      tags: { name: 'POST .../aportes' },
    });
  }
  check(r, { 'respuesta 2xx': (res) => res.status >= 200 && res.status < 300 });
  if (pausa > 0) sleep(pausa * (0.5 + Math.random()));
}

/** Visitante anónimo que simula antes de registrarse (endpoint público, cacheado y con rate limit). */
export function simulacionAnonima() {
  const meta = 100_000 + Math.floor(Math.random() * 50) * 10_000;
  const r = http.get(`${BASE}/v1/simulaciones?montoMetaCentavos=${meta}&fechaObjetivo=${fechaEnMeses(12)}&bloqueado=${Math.random() < 0.5}`, {
    tags: { name: 'GET /v1/simulaciones' },
  });
  check(r, { 'simulación 200 o 429 (rate limit)': (res) => res.status === 200 || res.status === 429 });
}
