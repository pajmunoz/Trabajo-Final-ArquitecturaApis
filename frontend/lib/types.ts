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

export interface Cuenta {
  id: string;
  tipo: string;
  alias: string;
  numero: string;
  moneda: "USD";
  saldo: number;
}

export interface TarjetaCredito {
  id: string;
  marca: "Visa" | "Mastercard";
  nombreTitular: string;
  numeroEnmascarado: string;
  saldoActual: number;
  limite: number;
  vencimiento: string;
  colorDesde: string;
  colorHasta: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  cuentas: Cuenta[];
  tarjetas: TarjetaCredito[];
}
