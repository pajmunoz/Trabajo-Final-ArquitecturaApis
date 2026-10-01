import Link from "next/link";
import type { PlanAhorro } from "@/lib/types";
import { formatCentavos, formatTasa } from "@/lib/format";
import { ProgressBar } from "./ProgressBar";

const ESTADO_ETIQUETA: Record<PlanAhorro["estado"], string | null> = {
  ACTIVO: null,
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

export function GoalletCard({ goallet }: { goallet: PlanAhorro }) {
  const estado = ESTADO_ETIQUETA[goallet.estado];

  return (
    <Link
      href={`/goallets/${goallet.id}`}
      className={`block bg-surface-container-lowest rounded-md p-5 shadow-sm hover:shadow-md transition-shadow ${
        goallet.estado === "CANCELADO" ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[22px]">{goallet.icono}</span>
          </div>
          <div>
            <h3 className="font-headline text-headline-sm text-on-surface">{goallet.nombre}</h3>
            {goallet.objetivo && (
              <p className="text-xs text-on-surface-variant line-clamp-1">{goallet.objetivo}</p>
            )}
          </div>
        </div>
        {(estado || goallet.bloqueado) && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-on-secondary-container bg-secondary-container px-2 py-1 rounded-full shrink-0">
            {estado ?? "Bloqueado"}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-headline text-currency text-on-surface">
          {formatCentavos(goallet.saldoCentavos)}
        </span>
        <span className="text-sm text-on-surface-variant">
          de {formatCentavos(goallet.montoMetaCentavos)}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <ProgressBar percent={goallet.progreso} />
        <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
          <span className="font-bold text-primary">{goallet.progreso.toFixed(0)}% completado</span>
          <span>TNA {formatTasa(goallet.tasas.totalAnual)}</span>
        </div>
      </div>
    </Link>
  );
}
