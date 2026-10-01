import { DomainError } from '../errors.js';

export type EstadoCuota = 'PROGRAMADA' | 'PENDIENTE' | 'EJECUTADA' | 'CANCELADA';

export const MAX_INTENTOS = 5;
export const HORAS_ENTRE_INTENTOS = 24;

export interface Cuota {
  id: string;
  planId: string;
  numero: number;
  fechaProgramada: string;
  montoCentavos: number;
  estado: EstadoCuota;
  intentos: number;
  proximoIntento: string | null;
  ejecutadaEn: string | null;
}

export type ResultadoRechazo = { cuota: Cuota; cancelada: boolean };

/**
 * Patrón State para el cobro de una cuota (RF-03.1):
 *   PROGRAMADA → PENDIENTE (entra al corte) → EJECUTADA
 *   PENDIENTE  → PENDIENTE (rechazo, reintento a las 24 h) → CANCELADA (5.º rechazo)
 * Un fallo técnico del banco reprograma el cobro sin consumir intentos.
 */
export interface EstadoCuotaState {
  readonly nombre: EstadoCuota;
  iniciarCobro(cuota: Cuota): Cuota;
  registrarExito(cuota: Cuota, ahora: Date): Cuota;
  registrarRechazo(cuota: Cuota, ahora: Date): ResultadoRechazo;
  registrarFalloTecnico(cuota: Cuota, ahora: Date): Cuota;
}

function enHoras(ahora: Date, horas: number): string {
  return new Date(ahora.getTime() + horas * 3_600_000).toISOString();
}

abstract class EstadoCuotaBase implements EstadoCuotaState {
  abstract readonly nombre: EstadoCuota;

  protected invalido(accion: string): never {
    throw new DomainError('ESTADO_INVALIDO', `No se puede ${accion} una cuota ${this.nombre}.`);
  }

  iniciarCobro(_cuota: Cuota): Cuota {
    return this.invalido('cobrar');
  }
  registrarExito(_cuota: Cuota, _ahora: Date): Cuota {
    return this.invalido('confirmar el cobro de');
  }
  registrarRechazo(_cuota: Cuota, _ahora: Date): ResultadoRechazo {
    return this.invalido('rechazar');
  }
  registrarFalloTecnico(_cuota: Cuota, _ahora: Date): Cuota {
    return this.invalido('reprogramar');
  }
}

class ProgramadaState extends EstadoCuotaBase {
  readonly nombre = 'PROGRAMADA' as const;

  override iniciarCobro(cuota: Cuota): Cuota {
    return { ...cuota, estado: 'PENDIENTE', proximoIntento: null };
  }
}

class PendienteState extends EstadoCuotaBase {
  readonly nombre = 'PENDIENTE' as const;

  // Un reintento vuelve a entrar al corte sin cambiar de estado.
  override iniciarCobro(cuota: Cuota): Cuota {
    return { ...cuota, proximoIntento: null };
  }

  override registrarExito(cuota: Cuota, ahora: Date): Cuota {
    return { ...cuota, estado: 'EJECUTADA', intentos: cuota.intentos + 1, proximoIntento: null, ejecutadaEn: ahora.toISOString() };
  }

  override registrarRechazo(cuota: Cuota, ahora: Date): ResultadoRechazo {
    const intentos = cuota.intentos + 1;
    if (intentos >= MAX_INTENTOS) {
      return { cuota: { ...cuota, estado: 'CANCELADA', intentos, proximoIntento: null }, cancelada: true };
    }
    return { cuota: { ...cuota, intentos, proximoIntento: enHoras(ahora, HORAS_ENTRE_INTENTOS) }, cancelada: false };
  }

  override registrarFalloTecnico(cuota: Cuota, ahora: Date): Cuota {
    return { ...cuota, proximoIntento: enHoras(ahora, HORAS_ENTRE_INTENTOS) };
  }
}

class EjecutadaState extends EstadoCuotaBase {
  readonly nombre = 'EJECUTADA' as const;
}

class CanceladaState extends EstadoCuotaBase {
  readonly nombre = 'CANCELADA' as const;
}

const estados: Record<EstadoCuota, EstadoCuotaState> = {
  PROGRAMADA: new ProgramadaState(),
  PENDIENTE: new PendienteState(),
  EJECUTADA: new EjecutadaState(),
  CANCELADA: new CanceladaState(),
};

export function estadoCuotaDe(cuota: Pick<Cuota, 'estado'>): EstadoCuotaState {
  return estados[cuota.estado];
}
