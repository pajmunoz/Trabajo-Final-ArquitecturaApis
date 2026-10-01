"use client";

import { useState } from "react";
import type { PlanAhorro } from "@/lib/types";
import { useGoalletStore } from "@/lib/store";
import { formatCentavos, formatTasa } from "@/lib/format";

/** POST /v1/planes-ahorro/{planId}/desbloqueo */
export function UnlockFundsPanel({ goallet }: { goallet: PlanAhorro }) {
  const desbloquear = useGoalletStore((s) => s.desbloquear);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const tasaActual = goallet.tasas.totalAnual;
  const tasaFinal = goallet.tasas.baseAnual;
  const perdida = goallet.interesesDevengadosCentavos;

  async function confirmar() {
    setError(null);
    setEnviando(true);
    const r = await desbloquear(goallet.id);
    setEnviando(false);
    if (!r.ok) {
      setError(r.mensaje);
      return;
    }
    setConfirmando(false);
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col gap-4 border border-secondary-container">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
          <span className="material-symbols-outlined text-[20px]">lock_open</span>
        </span>
        <div>
          <h2 className="font-headline text-headline-sm text-on-surface">Fondos bloqueados</h2>
          <p className="text-sm text-on-surface-variant">
            Este Goallet tiene una tasa preferencial de{" "}
            <span className="font-semibold text-on-surface">{formatTasa(tasaActual)} TNA</span> por
            mantener el ahorro bloqueado. Mientras esté bloqueado no admite retiros. Puedes
            desbloquearlo en cualquier momento.
          </p>
        </div>
      </div>

      {!confirmando ? (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="self-start inline-flex items-center gap-2 bg-surface-container-low text-on-surface text-sm font-medium px-4 py-2.5 rounded-sm hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">lock_open</span>
          Desbloquear fondos
        </button>
      ) : (
        <div className="flex flex-col gap-4 bg-error-container/40 rounded-sm p-4">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-error text-[20px]">warning</span>
            <p className="text-sm text-on-error-container">
              Si desbloqueas este Goallet perderás la tasa preferencial: bajará de{" "}
              <span className="font-semibold">{formatTasa(tasaActual)} TNA</span> a{" "}
              <span className="font-semibold">{formatTasa(tasaFinal)} TNA</span>.
              {perdida > 0 ? (
                <>
                  {" "}
                  Además se descuentan los intereses devengados:{" "}
                  <span className="font-semibold">{formatCentavos(perdida)}</span>.
                </>
              ) : null}{" "}
              Después puedes volver a bloquearlo, pero los intereses perdidos no se recuperan.
            </p>
          </div>
          {error && <p className="text-sm text-on-error-container">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void confirmar()}
              disabled={enviando}
              className="disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-2 bg-error text-white text-sm font-semibold px-4 py-2.5 rounded-sm hover:bg-error/90 transition-colors"
            >
              Confirmar desbloqueo
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface px-4 py-2.5"
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
