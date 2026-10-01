// Escenario 2 — Pico extremo (Spike): de 0 a 500 VUs de golpe, 1,5 min de pico, caída inmediata a 0
// y 1 min de recuperación con tráfico normal para verificar que el sistema vuelve solo a su estado normal.
// Incluye visitantes anónimos en /v1/simulaciones para observar el rate limiting (429) y la caché de Kong.
//   k6 run pruebas-carga/pico.js
import { preparar, sesionCliente, simulacionAnonima } from './lib.js';

export const options = {
  scenarios: {
    pico_clientes: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 450 }, // subida abrupta (5–10× la carga normal)
        { duration: '1m30s', target: 450 }, // pico
        { duration: '5s', target: 0 }, // caída inmediata
      ],
      gracefulRampDown: '10s',
      exec: 'clientes',
    },
    pico_anonimos: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '1m30s', target: 50 },
        { duration: '5s', target: 0 },
      ],
      gracefulRampDown: '10s',
      exec: 'anonimos',
    },
    recuperacion: {
      executor: 'constant-vus',
      vus: 20,
      duration: '1m',
      startTime: '2m', // después del pico
      exec: 'clientes',
      tags: { fase: 'recuperacion' },
    },
  },
  thresholds: {
    // Informativos en el pico; el criterio fuerte es que la recuperación vuelva a la normalidad.
    'http_req_duration{fase:recuperacion}': ['p(95)<500'],
    'http_req_failed{fase:recuperacion}': ['rate<0.01'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  return preparar(10);
}

export function clientes(datos) {
  sesionCliente(datos, 1);
}

export function anonimos() {
  simulacionAnonima();
}
