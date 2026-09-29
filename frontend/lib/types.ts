export type MovimientoTipo = "aporte" | "retiro" | "rendimiento";

export interface Movimiento {
  id: string;
  tipo: MovimientoTipo;
  descripcion: string;
  origen: string;
  monto: number;
  fecha: string;
  saldoResultante: number;
}

export interface Booster {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
  activo: boolean;
  etiqueta: string;
}

export interface Goallet {
  id: string;
  nombre: string;
  objetivo: string;
  icono: string;
  montoMeta: number;
  montoActual: number;
  aportePeriodicoSugerido: number;
  tasaTNA: number;
  tasaTEA: number;
  bloqueado: boolean;
  /** Tasa a la que vuelve el Goallet si se desbloquean los fondos antes de tiempo. */
  tasaTNASinBloqueo?: number;
  tasaTEASinBloqueo?: number;
  fechaLimite: string;
  creadoEn: string;
  boosters: Booster[];
  movimientos: Movimiento[];
}

export interface NuevoGoalletInput {
  nombre: string;
  objetivo: string;
  icono: string;
  montoMeta: number;
  aportePeriodicoSugerido: number;
  fechaLimite: string;
  bloqueado: boolean;
}
