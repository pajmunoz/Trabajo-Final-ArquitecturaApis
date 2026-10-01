// Réplica en el front del cálculo que hace el backend (patrón Strategy) para que la
// simulación de los datos de prueba coincida con GET /v1/simulaciones. Cuando el
// front se conecte a la API, la cuota y las tasas vendrán del servidor.
import type { Simulacion, Tasas } from "./types";

interface TramoTarifa {
  plazoMinimoMeses: number;
  plazoMaximoMeses: number | null;
  tasaBaseAnual: number;
  bonoBloqueoAnual: number;
}

/** Mismos tramos que el ejemplo de GET /v1/tarifas. */
export const TARIFAS: TramoTarifa[] = [
  { plazoMinimoMeses: 1, plazoMaximoMeses: 11, tasaBaseAnual: 4.0, bonoBloqueoAnual: 1.0 },
  { plazoMinimoMeses: 12, plazoMaximoMeses: 23, tasaBaseAnual: 4.5, bonoBloqueoAnual: 1.1 },
  { plazoMinimoMeses: 24, plazoMaximoMeses: null, tasaBaseAnual: 5.0, bonoBloqueoAnual: 1.25 },
];

export const PLAZO_MAXIMO_MESES = 120;

function redondear2(valor: number) {
  return Math.round(valor * 100) / 100;
}

/** TEA equivalente a una TNA con capitalización mensual. */
export function tasaEfectiva(tnaPorcentaje: number) {
  return redondear2(((1 + tnaPorcentaje / 1200) ** 12 - 1) * 100);
}

export function calcularTasas(plazoMeses: number, bloqueado: boolean): Tasas {
  const tramo =
    TARIFAS.find(
      (t) =>
        plazoMeses >= t.plazoMinimoMeses &&
        (t.plazoMaximoMeses === null || plazoMeses <= t.plazoMaximoMeses)
    ) ?? TARIFAS[TARIFAS.length - 1];
  const bono = bloqueado ? tramo.bonoBloqueoAnual : 0;
  const total = redondear2(tramo.tasaBaseAnual + bono);
  return {
    baseAnual: tramo.tasaBaseAnual,
    bonoBloqueoAnual: bono,
    totalAnual: total,
    efectivaAnual: tasaEfectiva(total),
  };
}

/** Tasas que quedan al desbloquear: la base congelada, sin bono. */
export function tasasSinBloqueo(tasas: Tasas): Tasas {
  return {
    baseAnual: tasas.baseAnual,
    bonoBloqueoAnual: 0,
    totalAnual: tasas.baseAnual,
    efectivaAnual: tasaEfectiva(tasas.baseAnual),
  };
}

function parseFecha(iso: string) {
  const [anio, mes, dia] = iso.split("T")[0].split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function sumarMeses(iso: string, meses: number) {
  const d = parseFecha(iso);
  d.setMonth(d.getMonth() + meses);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Meses completos entre `desde` y `fechaObjetivo` (mínimo 0). */
export function plazoEnMeses(fechaObjetivo: string, desde: string = hoyISO()) {
  const a = parseFecha(desde);
  const b = parseFecha(fechaObjetivo);
  let meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) meses -= 1;
  return Math.max(0, meses);
}

/** Cuota fija mensual (aporte al final de cada mes) para llegar a la meta. */
export function calcularCuota(montoMetaCentavos: number, plazoMeses: number, tnaPorcentaje: number) {
  const r = tnaPorcentaje / 1200;
  const factor = r === 0 ? plazoMeses : ((1 + r) ** plazoMeses - 1) / r;
  return Math.ceil(montoMetaCentavos / factor);
}

/** Equivalente local de GET /v1/simulaciones. Devuelve null si la fecha no es válida. */
export function simular(
  montoMetaCentavos: number,
  fechaObjetivo: string,
  bloqueado: boolean,
  desde: string = hoyISO()
): Simulacion | null {
  const plazoMeses = plazoEnMeses(fechaObjetivo, desde);
  if (montoMetaCentavos < 1 || plazoMeses < 1 || plazoMeses > PLAZO_MAXIMO_MESES) return null;

  const tasas = calcularTasas(plazoMeses, bloqueado);
  const cuota = calcularCuota(montoMetaCentavos, plazoMeses, tasas.totalAnual);
  const r = tasas.totalAnual / 1200;

  let saldo = 0;
  let intereses = 0;
  for (let mes = 1; mes <= plazoMeses; mes++) {
    const interes = Math.round(saldo * r);
    intereses += interes;
    saldo += interes + cuota;
  }

  return {
    moneda: "USD",
    montoMetaCentavos,
    fechaObjetivo,
    plazoMeses,
    bloqueado,
    tasas,
    cuotaMensualCentavos: cuota,
    totalAportadoCentavos: cuota * plazoMeses,
    interesesProyectadosCentavos: intereses,
    montoFinalCentavos: saldo,
  };
}

/** Campo calculado `progreso` del contrato: saldo / meta × 100, con dos decimales. */
export function calcularProgreso(saldoCentavos: number, montoMetaCentavos: number) {
  if (montoMetaCentavos <= 0) return 0;
  return Math.min(100, redondear2((saldoCentavos / montoMetaCentavos) * 100));
}

/** Próxima fecha de débito a partir de hoy para un día del mes dado. */
export function proximoDebito(diaDebito: number, desde: string = hoyISO()) {
  const d = parseFecha(desde);
  const candidato = new Date(d.getFullYear(), d.getMonth(), diaDebito);
  if (candidato < d) candidato.setMonth(candidato.getMonth() + 1);
  return `${candidato.getFullYear()}-${String(candidato.getMonth() + 1).padStart(2, "0")}-${String(candidato.getDate()).padStart(2, "0")}`;
}
