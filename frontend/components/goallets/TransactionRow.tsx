import type { Movimiento, TipoMovimiento } from "@/lib/types";
import { formatCentavos, formatDateTime } from "@/lib/format";

const ICONS: Record<TipoMovimiento, string> = {
  APORTE_AUTOMATICO: "event_repeat",
  APORTE_MANUAL: "add",
  INTERES: "percent",
  RETIRO: "arrow_downward",
  PENALIDAD: "remove_circle",
  DEVOLUCION: "undo",
};

const LABELS: Record<TipoMovimiento, string> = {
  APORTE_AUTOMATICO: "Aporte",
  APORTE_MANUAL: "Aporte",
  INTERES: "Rendimiento",
  RETIRO: "Retiro",
  PENALIDAD: "Penalidad",
  DEVOLUCION: "Devolución",
};

export function TransactionRow({ movimiento }: { movimiento: Movimiento }) {
  const positivo = movimiento.montoCentavos >= 0;
  return (
    <div className="flex items-center justify-between p-3 rounded-sm hover:bg-surface-container-low/70 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            positivo ? "bg-primary-container text-primary" : "bg-surface-container text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">{ICONS[movimiento.tipo]}</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-headline text-headline-sm text-on-surface">
              {movimiento.descripcion ?? LABELS[movimiento.tipo]}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
              {LABELS[movimiento.tipo]}
            </span>
          </div>
          <span className="text-xs text-on-surface-variant">
            {formatDateTime(movimiento.fecha)}
            {movimiento.origen ? ` · ${movimiento.origen}` : ""}
          </span>
        </div>
      </div>
      <div className="text-right">
        <span
          className={`font-headline text-headline-sm font-bold ${
            positivo ? "text-primary" : "text-error"
          }`}
        >
          {positivo ? "+" : "-"}
          {formatCentavos(Math.abs(movimiento.montoCentavos))}
        </span>
        <span className="block text-[10px] uppercase tracking-wide text-on-surface-variant">
          Saldo {formatCentavos(movimiento.saldoResultanteCentavos)}
        </span>
      </div>
    </div>
  );
}
