"use client";

import type { Booster } from "@/lib/types";

export function BoosterCard({
  booster,
  onToggle,
}: {
  booster: Booster;
  onToggle: () => void;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-md p-4 shadow-sm flex flex-col justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="w-9 h-9 rounded-sm bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">{booster.icono}</span>
          </span>
          <button
            aria-checked={booster.activo}
            role="switch"
            type="button"
            onClick={onToggle}
            className={`w-10 h-6 rounded-full relative p-0.5 transition-colors focus:outline-none ${
              booster.activo ? "bg-primary" : "bg-outline-variant"
            }`}
          >
            <span
              className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                booster.activo ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>
        <h3 className="font-headline text-headline-sm text-on-surface pt-1">{booster.titulo}</h3>
        <p className="text-sm text-on-surface-variant">{booster.descripcion}</p>
      </div>
      <div className="flex items-center justify-between pt-2">
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide ${
            booster.activo ? "text-primary" : "text-on-surface-variant"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${booster.activo ? "bg-primary" : "bg-outline-variant"}`}
          />
          {booster.etiqueta}
        </span>
      </div>
    </div>
  );
}
