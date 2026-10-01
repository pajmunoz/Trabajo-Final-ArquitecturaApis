// Datos de prueba con la misma forma que las respuestas de la API (contracts/openapi.yaml).
import { calcularCuota, calcularProgreso, calcularTasas, plazoEnMeses, proximoDebito } from "./finance";
import type {
  Cliente,
  CuentaDebito,
  Icono,
  Movimiento,
  PlanAhorro,
  TarjetaCredito,
  TipoMovimiento,
} from "./types";

/** Credenciales de prueba. En la API real se validan en POST /v1/auth/token. */
export const credencialesMock: { cliente: Cliente; contrasena: string }[] = [
  {
    cliente: {
      id: "6a1f0c2e-4b3d-4e5f-8a7b-1c2d3e4f5a60",
      nombre: "Pablo Jara",
      email: "pablo.jara@email.com",
    },
    contrasena: "goallet123",
  },
];

/** Equivalente a GET /v1/cuentas-debito. */
export const cuentasIniciales: CuentaDebito[] = [
  {
    id: "0c6f2a9e-1b3d-4e5f-8a7b-6c5d4e3f2a1b",
    alias: "pablo.ahorros",
    numeroEnmascarado: "******8901",
    tipo: "AHORROS",
    moneda: "USD",
    saldoDisponibleCentavos: 452830,
  },
  {
    id: "1d7a3b0f-2c4e-4f60-9b8c-7d6e5f4a3b2c",
    alias: "pablo.negocios",
    numeroEnmascarado: "******5432",
    tipo: "CORRIENTE",
    moneda: "USD",
    saldoDisponibleCentavos: 118450,
  },
  {
    id: "2e8b4c1a-3d5f-4a71-8c9d-8e7f6a5b4c3d",
    alias: "pablo.viajes",
    numeroEnmascarado: "******3344",
    tipo: "AHORROS",
    moneda: "USD",
    saldoDisponibleCentavos: 234050,
  },
];

/** Fuera del contrato: solo para el dashboard. Montos en centavos. */
export const tarjetasMock: TarjetaCredito[] = [
  {
    id: "tc-1",
    marca: "Visa",
    nombreTitular: "PABLO JARA",
    numeroEnmascarado: "4521 •••• •••• 3098",
    saldoActual: 86430,
    limite: 450000,
    vencimiento: "08/29",
    colorDesde: "#c85000",
    colorHasta: "#9e4000",
  },
  {
    id: "tc-2",
    marca: "Mastercard",
    nombreTitular: "PABLO JARA",
    numeroEnmascarado: "5412 •••• •••• 7761",
    saldoActual: 23980,
    limite: 300000,
    vencimiento: "02/28",
    colorDesde: "#2b2b2b",
    colorHasta: "#0a0a0a",
  },
  {
    id: "tc-3",
    marca: "Visa",
    nombreTitular: "PABLO JARA",
    numeroEnmascarado: "4916 •••• •••• 5214",
    saldoActual: 0,
    limite: 150000,
    vencimiento: "11/27",
    colorDesde: "#0e7bc4",
    colorHasta: "#0a5d94",
  },
];

export const iconosDisponibles: Icono[] = [
  "shield",
  "flight_takeoff",
  "directions_car",
  "home",
  "school",
  "celebration",
  "savings",
  "favorite",
];

interface MovimientoSemilla {
  tipo: TipoMovimiento;
  montoCentavos: number;
  fecha: string;
  descripcion: string;
  origen: string;
}

/** Arma un plan y su historial con los mismos cálculos que el backend. */
function semilla(datos: {
  id: string;
  nombre: string;
  objetivo: string;
  icono: Icono;
  montoMetaCentavos: number;
  fechaInicio: string;
  fechaObjetivo: string;
  diaDebito: number;
  cuentaDebito: CuentaDebito;
  bloqueado: boolean;
  saldoCentavos: number;
  interesesDevengadosCentavos: number;
  movimientos: (cuota: number) => MovimientoSemilla[];
}): { plan: PlanAhorro; movimientos: Movimiento[] } {
  const plazoMeses = plazoEnMeses(datos.fechaObjetivo, datos.fechaInicio);
  const tasas = calcularTasas(plazoMeses, datos.bloqueado);
  const cuota = calcularCuota(datos.montoMetaCentavos, plazoMeses, tasas.totalAnual);
  // En el plan, la cuenta viaja sin saldo (solo GET /v1/cuentas-debito lo incluye).
  const cuentaDebito: CuentaDebito = { ...datos.cuentaDebito };
  delete cuentaDebito.saldoDisponibleCentavos;

  // Del más antiguo al más reciente, calculando el saldo después de cada movimiento.
  const historial = datos.movimientos(cuota);
  let saldo = datos.saldoCentavos - historial.reduce((acc, m) => acc + m.montoCentavos, 0);
  const movimientos = historial
    .map((m, i) => {
      saldo += m.montoCentavos;
      return { id: `${datos.id}-m${i + 1}`, moneda: "USD" as const, saldoResultanteCentavos: saldo, ...m };
    })
    .reverse();

  return {
    plan: {
      id: datos.id,
      nombre: datos.nombre,
      objetivo: datos.objetivo,
      icono: datos.icono,
      estado: "ACTIVO",
      moneda: "USD",
      montoMetaCentavos: datos.montoMetaCentavos,
      fechaObjetivo: datos.fechaObjetivo,
      cuotaMensualCentavos: cuota,
      plazoMeses,
      prorrogasMeses: 0,
      diaDebito: datos.diaDebito,
      cuentaDebito,
      bloqueado: datos.bloqueado,
      bloqueadoDesde: datos.bloqueado ? `${datos.fechaInicio}T12:00:00Z` : null,
      tasas,
      saldoCentavos: datos.saldoCentavos,
      saldoDisponibleCentavos: datos.saldoCentavos,
      interesesDevengadosCentavos: datos.interesesDevengadosCentavos,
      progreso: calcularProgreso(datos.saldoCentavos, datos.montoMetaCentavos),
      proximoDebito: proximoDebito(datos.diaDebito),
      fechaInicio: datos.fechaInicio,
      fechaFinEstimada: datos.fechaObjetivo,
      creadoEn: `${datos.fechaInicio}T12:00:00Z`,
      actualizadoEn: movimientos[0]?.fecha ?? `${datos.fechaInicio}T12:00:00Z`,
    },
    movimientos,
  };
}

const semillas = [
  semilla({
    id: "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    nombre: "Fondo de Respaldo",
    objetivo: "Respaldo financiero para imprevistos operativos y de liquidez personal",
    icono: "shield",
    montoMetaCentavos: 1000000,
    fechaInicio: "2025-09-01",
    fechaObjetivo: "2026-12-01",
    diaDebito: 1,
    cuentaDebito: cuentasIniciales[0],
    bloqueado: false,
    saldoCentavos: 618325,
    interesesDevengadosCentavos: 2410,
    movimientos: (cuota) => [
      { tipo: "APORTE_MANUAL", montoCentavos: 50000, fecha: "2026-02-15T14:15:00Z", descripcion: "Aporte voluntario", origen: "Cuenta de Ahorros •• 8901" },
      { tipo: "APORTE_AUTOMATICO", montoCentavos: cuota, fecha: "2026-03-01T06:00:00Z", descripcion: "Aporte automático programado", origen: "Débito automático" },
      { tipo: "INTERES", montoCentavos: 900, fecha: "2026-03-01T08:30:00Z", descripcion: "Interés mensual acreditado", origen: "Rendimiento" },
    ],
  }),
  semilla({
    id: "8a4c6e2b-7d9f-4b1a-9c3e-5f7a9b1c3d5e",
    nombre: "Viaje familiar",
    objetivo: "Vacaciones familiares de una semana",
    icono: "flight_takeoff",
    montoMetaCentavos: 250000,
    fechaInicio: "2025-11-10",
    fechaObjetivo: "2026-11-15",
    diaDebito: 5,
    cuentaDebito: cuentasIniciales[2],
    bloqueado: false,
    saldoCentavos: 98000,
    interesesDevengadosCentavos: 0,
    movimientos: (cuota) => [
      { tipo: "APORTE_MANUAL", montoCentavos: 20000, fecha: "2026-02-20T11:20:00Z", descripcion: "Aporte voluntario", origen: "Cuenta de Ahorros •• 3344" },
      { tipo: "APORTE_AUTOMATICO", montoCentavos: cuota, fecha: "2026-03-05T06:00:00Z", descripcion: "Aporte automático programado", origen: "Débito automático" },
    ],
  }),
  semilla({
    id: "c5e7a9b1-2d4f-4c6e-8a0b-3d5f7a9c1e3b",
    nombre: "Auto Nuevo",
    objetivo: "Cuota inicial para la compra de un vehículo nuevo",
    icono: "directions_car",
    montoMetaCentavos: 1500000,
    fechaInicio: "2025-06-01",
    fechaObjetivo: "2027-06-01",
    diaDebito: 1,
    cuentaDebito: cuentasIniciales[0],
    bloqueado: true,
    saldoCentavos: 340000,
    interesesDevengadosCentavos: 6120,
    movimientos: (cuota) => [
      { tipo: "INTERES", montoCentavos: 1480, fecha: "2026-02-28T08:30:00Z", descripcion: "Interés mensual acreditado", origen: "Rendimiento" },
      { tipo: "APORTE_AUTOMATICO", montoCentavos: cuota, fecha: "2026-03-01T06:00:00Z", descripcion: "Aporte automático programado", origen: "Débito automático" },
    ],
  }),
];

export const planesIniciales: PlanAhorro[] = semillas.map((s) => s.plan);

export const movimientosIniciales: Record<string, Movimiento[]> = Object.fromEntries(
  semillas.map((s) => [s.plan.id, s.movimientos])
);
