import Link from "next/link";
import type { Goallet } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { ProgressBar } from "./ProgressBar";

export function GoalletCard({ goallet }: { goallet: Goallet }) {
  const percent = (goallet.montoActual / goallet.montoMeta) * 100;

  return (
    <Link
      href={`/goallets/${goallet.id}`}
      className="block bg-surface-container-lowest rounded-md p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[22px]">{goallet.icono}</span>
          </div>
          <div>
            <h3 className="font-headline text-headline-sm text-on-surface">{goallet.nombre}</h3>
            <p className="text-xs text-on-surface-variant line-clamp-1">{goallet.objetivo}</p>
          </div>
        </div>
        {goallet.bloqueado && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-on-secondary-container bg-secondary-container px-2 py-1 rounded-full shrink-0">
            Bloqueado
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-headline text-currency text-on-surface">
          {formatMoney(goallet.montoActual)}
        </span>
        <span className="text-sm text-on-surface-variant">
          de {formatMoney(goallet.montoMeta)}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <ProgressBar percent={percent} />
        <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
          <span className="font-bold text-primary">{percent.toFixed(0)}% completado</span>
          <span>TNA {goallet.tasaTNA.toFixed(2)}%</span>
        </div>
      </div>
    </Link>
  );
}
