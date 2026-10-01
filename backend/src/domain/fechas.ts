// Fechas de calendario como 'YYYY-MM-DD' (formato `date` del contrato), sin zona horaria.

function partes(iso: string): [number, number, number] {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return [anio ?? 0, mes ?? 1, dia ?? 1];
}

function formatear(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Fecha de calendario (UTC) de un instante. */
export function fechaDe(instante: Date): string {
  return instante.toISOString().slice(0, 10);
}

/** Suma meses conservando el día; si el mes destino es más corto, usa su último día. */
export function sumarMeses(iso: string, meses: number): string {
  const [anio, mes, dia] = partes(iso);
  const total = anio * 12 + (mes - 1) + meses;
  const nuevoAnio = Math.floor(total / 12);
  const nuevoMes = (total % 12) + 1;
  const ultimoDia = new Date(Date.UTC(nuevoAnio, nuevoMes, 0)).getUTCDate();
  return formatear(nuevoAnio, nuevoMes, Math.min(dia, ultimoDia));
}

/** Meses completos entre dos fechas (0 si `hasta` es anterior). */
export function mesesEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = partes(desde);
  const [a2, m2, d2] = partes(hasta);
  let meses = (a2 - a1) * 12 + (m2 - m1);
  if (d2 < d1) meses -= 1;
  return Math.max(0, meses);
}

/** Primera fecha con el día `dia` estrictamente posterior a `desde`. */
export function proximaFechaConDia(desde: string, dia: number): string {
  const [anio, mes, diaActual] = partes(desde);
  const candidata = formatear(anio, mes, dia);
  return dia > diaActual ? candidata : sumarMeses(candidata, 1);
}
