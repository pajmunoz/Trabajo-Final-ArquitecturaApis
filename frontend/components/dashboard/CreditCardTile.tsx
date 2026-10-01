import type { TarjetaCredito } from "@/lib/types";
import { formatCentavos } from "@/lib/format";

export function CreditCardTile({ tarjeta }: { tarjeta: TarjetaCredito }) {
  const disponible = tarjeta.limite - tarjeta.saldoActual;

  return (
    <div
      className="shrink-0 snap-start w-[280px] sm:w-[300px] aspect-[1.586/1] rounded-lg p-5 flex flex-col justify-between text-white shadow-md"
      style={{
        background: `linear-gradient(135deg, ${tarjeta.colorDesde}, ${tarjeta.colorHasta})`,
      }}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold uppercase tracking-wide opacity-80">
          Tarjeta de Crédito
        </span>
        <span className="font-headline text-headline-sm font-bold">{tarjeta.marca}</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-base sm:text-lg tracking-[0.2em] font-medium">
          {tarjeta.numeroEnmascarado}
        </span>
        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            <span className="text-[10px] uppercase tracking-wide opacity-70 block">Titular</span>
            <span className="text-sm font-semibold">{tarjeta.nombreTitular}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wide opacity-70 block">Vence</span>
            <span className="text-sm font-semibold">{tarjeta.vencimiento}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/20 pt-2 mt-1">
        <div>
          <span className="text-[10px] uppercase tracking-wide opacity-70 block">Saldo actual</span>
          <span className="font-headline text-sm font-bold">{formatCentavos(tarjeta.saldoActual)}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wide opacity-70 block">Disponible</span>
          <span className="font-headline text-sm font-bold">{formatCentavos(disponible)}</span>
        </div>
      </div>
    </div>
  );
}
