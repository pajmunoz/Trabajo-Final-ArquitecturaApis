import { fechaDe } from '../../domain/fechas.js';
import { simular, type Simulacion } from '../../domain/simulacion.js';
import { TARIFAS_VIGENTES, type TablaTarifas } from '../../domain/tarifas.js';
import type { Reloj } from '../ports/servicios.js';

/** Endpoints públicos: tarifas y simulación (sin autenticación, cacheables). */
export class SimulacionService {
  constructor(private readonly reloj: Reloj) {}

  tarifas(): TablaTarifas {
    return TARIFAS_VIGENTES;
  }

  simular(montoMetaCentavos: number, fechaObjetivo: string, bloqueado: boolean): Simulacion {
    return simular(montoMetaCentavos, fechaObjetivo, bloqueado, fechaDe(this.reloj.ahora()));
  }
}
