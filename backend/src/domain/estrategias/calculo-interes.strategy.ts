import { componerTasas, tramoPara, type Tasas } from '../tarifas.js';

/**
 * Patrón Strategy: cómo se calcula la tasa de un plan según esté bloqueado o no.
 * La simulación pública y el plan real usan la misma estrategia, así el valor
 * simulado coincide con el contratado (RF-02.1, RF-01.6).
 */
export interface CalculoInteresStrategy {
  readonly nombre: 'TASA_BASE' | 'TASA_CON_BONO';
  /** Tasas aplicables a un plan con ese plazo y esa tasa base congelada. */
  tasas(plazoMeses: number, tasaBaseAnual?: number): Tasas;
  /** Interés de un mes sobre el saldo, en centavos. */
  interesMensual(saldoCentavos: number, tasas: Tasas): number;
}

function interesMensual(saldoCentavos: number, tasas: Tasas): number {
  return Math.round((saldoCentavos * tasas.totalAnual) / 1200);
}

export class TasaBaseStrategy implements CalculoInteresStrategy {
  readonly nombre = 'TASA_BASE' as const;

  tasas(plazoMeses: number, tasaBaseAnual?: number): Tasas {
    return componerTasas(tasaBaseAnual ?? tramoPara(plazoMeses).tasaBaseAnual, 0);
  }

  interesMensual = interesMensual;
}

export class TasaConBonoStrategy implements CalculoInteresStrategy {
  readonly nombre = 'TASA_CON_BONO' as const;

  tasas(plazoMeses: number, tasaBaseAnual?: number): Tasas {
    const tramo = tramoPara(plazoMeses);
    return componerTasas(tasaBaseAnual ?? tramo.tasaBaseAnual, tramo.bonoBloqueoAnual);
  }

  interesMensual = interesMensual;
}

const tasaBase = new TasaBaseStrategy();
const tasaConBono = new TasaConBonoStrategy();

export function calculoInteresPara(bloqueado: boolean): CalculoInteresStrategy {
  return bloqueado ? tasaConBono : tasaBase;
}
