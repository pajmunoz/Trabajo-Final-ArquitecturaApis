import type { Movimiento } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/format";

const ICONS: Record<Movimiento["tipo"], string> = {
  aporte: "add",
  retiro: "arrow_downward",
  rendimiento: "percent",
};

const LABELS: Record<Movimiento["tipo"], string> = {
  aporte: "Aporte",
  retiro: "Retiro",
  rendimiento: "Rendimiento",
};

export function TransactionRow({ movimiento }: { movimiento: Movimiento }) {
  const positivo = movimiento.monto >= 0;
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
              {movimiento.descripcion}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
              {LABELS[movimiento.tipo]}
            </span>
          </div>
          <span className="text-xs text-on-surface-variant">
            {formatDateTime(movimiento.fecha)} · {movimiento.origen}
          </span>
        </div>
      </div>
      <div className="text-right">
        <span
          className={`font-headline text-headline-sm font-bold ${
            positivo ? "text-primary" : "text-error"
          }`}
        >
          {positivo ? "+" : "-"}${formatMoney(Math.abs(movimiento.monto))}
        </span>
        <span className="block text-[10px] uppercase tracking-wide text-on-surface-variant">
          Saldo ${formatMoney(movimiento.saldoResultante)}
        </span>
      </div>
    </div>
  );
}
