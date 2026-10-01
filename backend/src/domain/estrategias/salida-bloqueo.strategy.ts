/**
 * Patrón Strategy: cuánto cuesta salir de un plan (desbloquear o cancelar).
 * Regla única (RF-01.7, RF-04.2): si el plan estaba bloqueado se pierden los
 * intereses devengados; si no, no hay penalidad.
 */
export interface PoliticaSalidaBloqueoStrategy {
  readonly nombre: 'SIN_PENALIDAD' | 'PIERDE_INTERESES_DEVENGADOS';
  interesesPerdidos(interesesDevengadosCentavos: number): number;
}

export class SinPenalidadStrategy implements PoliticaSalidaBloqueoStrategy {
  readonly nombre = 'SIN_PENALIDAD' as const;

  interesesPerdidos(): number {
    return 0;
  }
}

export class PierdeInteresesDevengadosStrategy implements PoliticaSalidaBloqueoStrategy {
  readonly nombre = 'PIERDE_INTERESES_DEVENGADOS' as const;

  interesesPerdidos(interesesDevengadosCentavos: number): number {
    return Math.max(0, interesesDevengadosCentavos);
  }
}

const sinPenalidad = new SinPenalidadStrategy();
const pierdeIntereses = new PierdeInteresesDevengadosStrategy();

export function politicaSalidaPara(bloqueado: boolean): PoliticaSalidaBloqueoStrategy {
  return bloqueado ? pierdeIntereses : sinPenalidad;
}
