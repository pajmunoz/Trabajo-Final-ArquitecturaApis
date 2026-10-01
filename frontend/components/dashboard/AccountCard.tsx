import type { Cuenta } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export function AccountCard({ cuenta }: { cuenta: Cuenta }) {
  return (
    <div className="bg-surface-container-lowest rounded-md p-5 shadow-sm flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
        <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-headline text-headline-sm text-on-surface">{cuenta.tipo}</h3>
        <p className="text-xs text-on-surface-variant truncate">
          {cuenta.alias} · N° {cuenta.numero.slice(-4)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <span className="font-headline text-headline-sm font-bold text-on-surface">
          {formatMoney(cuenta.saldo)}
        </span>
        <p className="text-[11px] text-on-surface-variant">{cuenta.moneda}</p>
      </div>
    </div>
  );
}
