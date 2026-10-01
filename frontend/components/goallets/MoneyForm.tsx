"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Goallet } from "@/lib/types";
import { useGoalletStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { QuickAmountChips } from "./QuickAmountChips";

const CUENTAS = ["Cuenta Corriente •• 4821", "Caja de Ahorro •• 2801"];

export function MoneyForm({
  goallet,
  modo,
}: {
  goallet: Goallet;
  modo: "aportar" | "retirar";
}) {
  const router = useRouter();
  const aportar = useGoalletStore((s) => s.aportar);
  const retirar = useGoalletStore((s) => s.retirar);

  const [monto, setMonto] = useState<number | null>(null);
  const [cuenta, setCuenta] = useState(CUENTAS[0]);
  const [error, setError] = useState<string | null>(null);

  const esAporte = modo === "aportar";
  const disponible = goallet.bloqueado && modo === "retirar" ? 0 : goallet.montoActual;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!monto || monto <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    if (!esAporte && goallet.bloqueado) {
      setError("Este Goallet tiene los fondos bloqueados y no admite retiros.");
      return;
    }
    if (!esAporte && monto > goallet.montoActual) {
      setError("El monto supera el saldo disponible.");
      return;
    }

    if (esAporte) {
      aportar(goallet.id, monto, cuenta);
    } else {
      retirar(goallet.id, monto);
    }
    router.push(`/goallets/${goallet.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col items-center gap-4">
        <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
          {esAporte ? "Monto a aportar" : "Monto a retirar"}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="font-headline text-headline-md text-on-surface-variant">$</span>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={monto ?? ""}
            onChange={(e) => {
              setError(null);
              const value = e.target.value;
              setMonto(value === "" ? null : Number(value));
            }}
            placeholder="0.00"
            className="font-headline text-display text-on-surface bg-transparent text-center w-56 outline-none border-b-2 border-primary focus:border-primary-dark"
          />
        </div>
        <QuickAmountChips selected={monto} onSelect={(m) => { setMonto(m); setError(null); }} />
        {!esAporte && (
          <p className="text-xs text-on-surface-variant">
            Disponible para retirar: {formatMoney(disponible)}
          </p>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col gap-3">
        <label className="text-sm font-semibold text-on-surface" htmlFor="cuenta">
          {esAporte ? "Cuenta de origen" : "Cuenta de destino"}
        </label>
        <select
          id="cuenta"
          value={cuenta}
          onChange={(e) => setCuenta(e.target.value)}
          className="bg-surface-container-low text-on-surface text-sm rounded-sm px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
        >
          {CUENTAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-error bg-error-container text-on-error-container rounded-sm px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold text-sm px-6 py-3 rounded-sm hover:bg-primary-dark transition-colors shadow-sm active:scale-[0.99]"
      >
        Confirmar {esAporte ? "aporte" : "retiro"}
      </button>
    </form>
  );
}
