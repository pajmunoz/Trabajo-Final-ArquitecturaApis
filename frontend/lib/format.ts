/** Formatea un monto en centavos (como viaja en la API) para mostrarlo en dólares. */
export function formatCentavos(centavos: number) {
  return (centavos / 100).toLocaleString("es-EC", { style: "currency", currency: "USD" });
}

/** Convierte lo que el usuario escribe en dólares ("12.5") a centavos enteros (1250). */
export function dolaresACentavos(dolares: number) {
  return Math.round(dolares * 100);
}

export function formatTasa(porcentaje: number) {
  return `${porcentaje.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

export function formatDate(iso: string) {
  // Date-only strings ("YYYY-MM-DD") are parsed by `Date` as UTC midnight,
  // which can shift a day back once rendered in a negative-UTC timezone.
  // Parsing the parts explicitly keeps the date as entered.
  const [year, month, day] = iso.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function cuentaEtiqueta(cuenta: { tipo: "AHORROS" | "CORRIENTE"; numeroEnmascarado: string }) {
  const tipo = cuenta.tipo === "AHORROS" ? "Cuenta de Ahorros" : "Cuenta Corriente";
  return `${tipo} •• ${cuenta.numeroEnmascarado.slice(-4)}`;
}
