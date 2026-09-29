"use client";

import { useState } from "react";
import type { Goallet } from "@/lib/types";
import { useGoalletStore } from "@/lib/store";

export function UnlockFundsPanel({ goallet }: { goallet: Goallet }) {
  const desbloquear = useGoalletStore((s) => s.desbloquear);
  const [confirmando, setConfirmando] = useState(false);

  const tasaActualTNA = goallet.tasaTNA;
  const tasaFinalTNA = goallet.tasaTNASinBloqueo ?? goallet.tasaTNA;
  const perdidaTNA = tasaActualTNA - tasaFinalTNA;

  return (
    <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col gap-4 border border-primary-container">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined text-[20px]">lock_open</span>
        </span>
        <div>
          <h2 className="font-headline text-headline-sm text-on-surface">Fondos bloqueados</h2>
          <p className="text-sm text-on-surface-variant">
            Este Goallet tiene una tasa preferencial de{" "}
            <span className="font-semibold text-on-surface">{tasaActualTNA.toFixed(2)}% TNA</span> por
            mantener el ahorro bloqueado. Podés desbloquearlo en cualquier momento para retirar fondos.
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
              Si desbloqueás este Goallet vas a perder la tasa preferencial. Tu tasa bajará de{" "}
              <span className="font-semibold">{tasaActualTNA.toFixed(2)}% TNA</span> a{" "}
              <span className="font-semibold">{tasaFinalTNA.toFixed(2)}% TNA</span>
              {perdidaTNA > 0 && (
                <>
                  {" "}
                  (−{perdidaTNA.toFixed(2)} puntos de interés adicional).
                </>
              )}{" "}
              Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                desbloquear(goallet.id);
                setConfirmando(false);
              }}
              className="inline-flex items-center gap-2 bg-error text-white text-sm font-semibold px-4 py-2.5 rounded-sm hover:bg-error/90 transition-colors"
            >
              Confirmar desbloqueo
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface px-4 py-2.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
