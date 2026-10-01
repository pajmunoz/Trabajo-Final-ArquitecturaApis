"use client";

import { useRef } from "react";
import type { TarjetaCredito } from "@/lib/types";
import { CreditCardTile } from "./CreditCardTile";

export function CreditCardCarousel({ tarjetas }: { tarjetas: TarjetaCredito[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  if (tarjetas.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant">
        Todavía no tienes tarjetas de crédito asociadas.
      </p>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tarjetas.map((tarjeta) => (
          <CreditCardTile key={tarjeta.id} tarjeta={tarjeta} />
        ))}
      </div>
      {tarjetas.length > 1 && (
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            aria-label="Tarjeta anterior"
            onClick={() => scrollBy(-320)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button
            type="button"
            aria-label="Siguiente tarjeta"
            onClick={() => scrollBy(320)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
