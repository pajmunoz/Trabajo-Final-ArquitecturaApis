// Escenario 1 — Carga sostenida (Load/Stress): 0 → 200 VUs en 2,5 min, meseta de 7 min, bajada en 1,5 min.
//   k6 run pruebas-carga/carga-sostenida.js
import { preparar, sesionCliente } from './lib.js';

export const options = {
  scenarios: {
    sostenida: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m30s', target: 200 }, // ramp-up
        { duration: '7m', target: 200 }, // plateau
        { duration: '1m30s', target: 0 }, // ramp-down
      ],
      gracefulRampDown: '20s',
    },
  },
  // Umbrales de la rúbrica: p95 < 500 ms y tasa de error < 1 % bajo carga sostenida.
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  return preparar(10);
}

export default function (datos) {
  sesionCliente(datos, 1);
}
