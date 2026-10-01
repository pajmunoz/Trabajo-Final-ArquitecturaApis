// Escenario 3 — Punto de ruptura (Breakpoint): la tasa de llegada sube de forma continua
// (de 20 a 1200 peticiones/s en 10 min) hasta que la API se degrada. La prueba se detiene
// sola cuando el p95 supera 1,5 s o los errores pasan del 5 %; el momento exacto se obtiene
// de la serie de tiempo (docs/evidencias/fase-4-carga/ruptura-serie.csv).
//   k6 run --out csv=../docs/evidencias/fase-4-carga/ruptura.csv pruebas-carga/ruptura.js
import { preparar, sesionCliente } from './lib.js';

export const options = {
  scenarios: {
    ruptura: {
      executor: 'ramping-arrival-rate',
      startRate: 20,
      timeUnit: '1s',
      preAllocatedVUs: 300,
      maxVUs: 2000,
      stages: [{ duration: '10m', target: 1200 }],
    },
  },
  thresholds: {
    http_req_duration: [{ threshold: 'p(95)<1500', abortOnFail: true, delayAbortEval: '30s' }],
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' }],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  return preparar(10);
}

// Sin pausa: cada iteración es una petición; el ejecutor controla la tasa.
export default function (datos) {
  sesionCliente(datos, 0);
}
