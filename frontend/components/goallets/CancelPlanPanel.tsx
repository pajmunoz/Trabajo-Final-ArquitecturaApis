"use client";

import { useState } from "react";
import type { PlanAhorro } from "@/lib/types";
import { useGoalletStore } from "@/lib/store";
import { cuentaEtiqueta, formatCentavos } from "@/lib/format";

/** POST /v1/planes-ahorro/{planId}/cancelacion */
export function CancelPlanPanel({ goallet }: { goallet: PlanAhorro }) {
  const cancelar = useGoalletStore((s) => s.cancelar);
  const cuentas = useGoalletStore((s) => s.cuentas);
  const [confirmando, setConfirmando] = useState(false);
  const [cuentaId, setCuentaId] = useState(goallet.cuentaDebito.id);
  const [error, setError] = useState<string | null>(null);

  const perdida = goallet.bloqueado ? goallet.interesesDevengadosCentavos : 0;
  const aDevolver = goallet.saldoCentavos - perdida;

  function confirmar() {
    const r = cancelar(goallet.id, cuentaId);
    if (!r.ok) {
      setError(r.mensaje);
      return;
    }
    setConfirmando(false);
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col gap-4">
      <div>
        <h2 className="font-headline text-headline-sm text-on-surface">Cancelar Goallet</h2>
        <p className="text-sm text-on-surface-variant">
          Cierra este Goallet y recupera el saldo en una de tus cuentas. Esta acción no se puede deshacer.
        </p>
      </div>

      {!confirmando ? (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="self-start inline-flex items-center gap-2 text-error text-sm font-medium px-4 py-2.5 rounded-sm border border-error/40 hover:bg-error-container/40 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">cancel</span>
          Cancelar Goallet
        </button>
      ) : (
        <div className="flex flex-col gap-4 bg-error-container/40 rounded-sm p-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-on-surface" htmlFor="cuenta-devolucion">
              Cuenta de destino
            </label>
            <select
              id="cuenta-devolucion"
              value={cuentaId}
              onChange={(e) => setCuentaId(e.target.value)}
              className="bg-surface-container-low text-on-surface text-sm rounded-sm px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
            >
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {cuentaEtiqueta(c)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-on-error-container">
            Se devolverán <span className="font-semibold">{formatCentavos(aDevolver)}</span>.
            {perdida > 0 && (
              <>
                {" "}
                Como el Goallet está bloqueado, se descuentan los intereses devengados (
                <span className="font-semibold">{formatCentavos(perdida)}</span>).
              </>
            )}
          </p>
          {error && <p className="text-sm text-on-error-container">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={confirmar}
              className="inline-flex items-center gap-2 bg-error text-white text-sm font-semibold px-4 py-2.5 rounded-sm hover:bg-error/90 transition-colors"
            >
              Confirmar cancelación
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
