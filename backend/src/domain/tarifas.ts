export interface TramoTarifa {
  plazoMinimoMeses: number;
  plazoMaximoMeses: number | null;
  tasaBaseAnual: number;
  bonoBloqueoAnual: number;
}

export interface TablaTarifas {
  moneda: 'USD';
  vigenteDesde: string;
  tramos: TramoTarifa[];
}

/** Tasas del contrato: nominales anuales (TNA) y efectiva anual (TEA). */
export interface Tasas {
  baseAnual: number;
  bonoBloqueoAnual: number;
  totalAnual: number;
  efectivaAnual: number;
}

export const PLAZO_MINIMO_MESES = 1;
export const PLAZO_MAXIMO_MESES = 120;

// Tabla vigente. Vive en el backend: cambiarla no exige redesplegar el frontend.
export const TARIFAS_VIGENTES: TablaTarifas = {
  moneda: 'USD',
  vigenteDesde: '2026-09-01',
  tramos: [
    { plazoMinimoMeses: 1, plazoMaximoMeses: 11, tasaBaseAnual: 4.0, bonoBloqueoAnual: 1.0 },
    { plazoMinimoMeses: 12, plazoMaximoMeses: 23, tasaBaseAnual: 4.5, bonoBloqueoAnual: 1.1 },
    { plazoMinimoMeses: 24, plazoMaximoMeses: null, tasaBaseAnual: 5.0, bonoBloqueoAnual: 1.25 },
  ],
};

export function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** TEA equivalente a una TNA con capitalización mensual. */
export function tasaEfectiva(tnaPorcentaje: number): number {
  return redondear2(((1 + tnaPorcentaje / 1200) ** 12 - 1) * 100);
}

export function tramoPara(plazoMeses: number, tabla: TablaTarifas = TARIFAS_VIGENTES): TramoTarifa {
  const tramo = tabla.tramos.find(
    (t) => plazoMeses >= t.plazoMinimoMeses && (t.plazoMaximoMeses === null || plazoMeses <= t.plazoMaximoMeses),
  );
  return tramo ?? (tabla.tramos[tabla.tramos.length - 1] as TramoTarifa);
}

export function componerTasas(baseAnual: number, bonoBloqueoAnual: number): Tasas {
  const totalAnual = redondear2(baseAnual + bonoBloqueoAnual);
  return { baseAnual, bonoBloqueoAnual, totalAnual, efectivaAnual: tasaEfectiva(totalAnual) };
}
