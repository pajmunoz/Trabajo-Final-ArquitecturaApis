// Datos fijos del front que no vienen de la API: las tarjetas de crédito pertenecen
// al Core bancario y solo se muestran en el dashboard; los íconos son los del contrato.
import type { Icono, TarjetaCredito } from "./types";

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
