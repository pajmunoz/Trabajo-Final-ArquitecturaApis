// Utilidades de fechas del formulario de nuevo plan. La cuota, las tasas y la
// proyección las calcula la API (GET /v1/simulaciones y GET /v1/tarifas).

function parseFecha(iso: string) {
  const [anio, mes, dia] = iso.split("T")[0].split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function sumarMeses(iso: string, meses: number) {
  const d = parseFecha(iso);
  d.setMonth(d.getMonth() + meses);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
