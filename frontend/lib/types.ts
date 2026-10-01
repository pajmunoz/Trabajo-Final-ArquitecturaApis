// Tipos alineados con contracts/openapi.yaml. Los montos van en centavos (enteros)
// y las tasas como porcentaje anual (4.5 = 4,5 %).

export type Moneda = "USD";

export type Icono =
  | "shield"
  | "flight_takeoff"
  | "directions_car"
  | "home"
  | "school"
  | "celebration"
  | "savings"
  | "favorite";

export type EstadoPlan = "ACTIVO" | "COMPLETADO" | "CANCELADO";

export type EstadoDebito = "PENDIENTE" | "EJECUTADO" | "FALLIDO";

export type TipoMovimiento =
  | "APORTE_AUTOMATICO"
  | "APORTE_MANUAL"
  | "INTERES"
  | "RETIRO"
  | "PENALIDAD"
  | "DEVOLUCION";

export interface Cliente {
  id: string;
  nombre: string;
  email: string;
}

export interface CuentaDebito {
  id: string;
  alias?: string;
  numeroEnmascarado: string;
  tipo: "AHORROS" | "CORRIENTE";
  moneda: Moneda;
  /** Solo viene en GET /v1/cuentas-debito. */
  saldoDisponibleCentavos?: number;
}

export interface Tasas {
  baseAnual: number;
  bonoBloqueoAnual: number;
  totalAnual: number;
  efectivaAnual: number;
}

export interface PlanAhorro {
  id: string;
  nombre: string;
  objetivo?: string;
  icono: Icono;
  estado: EstadoPlan;
  moneda: Moneda;
  montoMetaCentavos: number;
  fechaObjetivo: string;
  cuotaMensualCentavos: number;
  plazoMeses: number;
  prorrogasMeses?: number;
  diaDebito: number;
  cuentaDebito: CuentaDebito;
  bloqueado: boolean;
  bloqueadoDesde?: string | null;
  tasas: Tasas;
  saldoCentavos: number;
  saldoDisponibleCentavos: number;
  interesesDevengadosCentavos: number;
  progreso: number;
  proximoDebito?: string | null;
  fechaInicio: string;
  fechaFinEstimada: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  montoCentavos: number;
  moneda: Moneda;
  saldoResultanteCentavos: number;
  fecha: string;
  descripcion?: string;
  origen?: string;
}

export interface ResumenPlanes {
  moneda: Moneda;
  totalAhorradoCentavos: number;
  totalMetaCentavos: number;
  cantidadPlanes: number;
  planesActivos: number;
}

export interface Simulacion {
  moneda: Moneda;
  montoMetaCentavos: number;
  fechaObjetivo: string;
  plazoMeses: number;
  bloqueado: boolean;
  tasas: Tasas;
  cuotaMensualCentavos: number;
  totalAportadoCentavos: number;
  interesesProyectadosCentavos: number;
  montoFinalCentavos: number;
}

/** Cuerpo de POST /v1/planes-ahorro. */
export interface CrearPlanAhorro {
  nombre: string;
  objetivo?: string;
  icono: Icono;
  montoMetaCentavos: number;
  fechaObjetivo: string;
  diaDebito: number;
  cuentaDebitoId: string;
  bloqueado: boolean;
}

// Fuera del contrato: las tarjetas pertenecen al Core bancario y solo se muestran
// en el dashboard con datos de prueba.
export interface TarjetaCredito {
  id: string;
  marca: "Visa" | "Mastercard";
  nombreTitular: string;
  numeroEnmascarado: string;
  /** Centavos. */
  saldoActual: number;
  /** Centavos. */
  limite: number;
  vencimiento: string;
  colorDesde: string;
  colorHasta: string;
}

export interface TramoTarifa {
  plazoMinimoMeses: number;
  plazoMaximoMeses?: number | null;
  tasaBaseAnual: number;
  bonoBloqueoAnual: number;
}

export interface TablaTarifas {
  moneda: Moneda;
  vigenteDesde: string;
  tramos: TramoTarifa[];
}
