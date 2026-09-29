import Link from "next/link";
import type { Goallet } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export function BalanceHero({ goallet }: { goallet: Goallet }) {
  const rendimientoMes = goallet.movimientos.find((m) => m.tipo === "rendimiento");

  return (
    <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none" />
      <div className="flex flex-col gap-3 z-10">
        <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
          Saldo actual
        </span>
        <div className="flex items-baseline gap-2">
          <span className="font-headline text-headline-md text-on-surface-variant font-medium">$</span>
          <span className="font-headline text-display text-on-surface tracking-tight">
            {formatMoney(goallet.montoActual)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="inline-flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-full">
            <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>
            <span className="text-sm text-on-surface">Tasa:</span>
            <span className="text-sm text-primary font-bold">{goallet.tasaTNA.toFixed(2)}% TNA</span>
          </div>
          {rendimientoMes && (
            <div className="inline-flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                account_balance
              </span>
              <span className="text-sm text-on-surface">Rendimiento reciente:</span>
              <span className="text-sm text-on-surface font-semibold">
                +${formatMoney(rendimientoMes.monto)}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 z-10">
        <Link
          href={`/goallets/${goallet.id}/aportar`}
          className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary text-sm font-semibold px-6 py-3 rounded-sm hover:bg-primary-dark transition-colors shadow-sm active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          <span>Aportar dinero</span>
        </Link>
        <Link
          href={`/goallets/${goallet.id}/retirar`}
          className="inline-flex items-center justify-center gap-1.5 bg-surface-container-low text-on-surface text-sm font-medium px-4 py-2.5 rounded-sm hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
            arrow_downward
          </span>
          <span>Retirar fondos</span>
        </Link>
      </div>
    </div>
  );
}
