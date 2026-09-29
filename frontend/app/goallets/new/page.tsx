"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { useGoalletStore } from "@/lib/store";
import { iconosDisponibles } from "@/lib/mock-data";

export default function NuevoGoalletPage() {
  const router = useRouter();
  const crearGoallet = useGoalletStore((s) => s.crearGoallet);

  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [icono, setIcono] = useState(iconosDisponibles[0]);
  const [montoMeta, setMontoMeta] = useState("");
  const [aporteMensual, setAporteMensual] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [bloqueado, setBloqueado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const meta = Number(montoMeta);
    const aporte = Number(aporteMensual);

    if (!nombre.trim()) {
      setError("Ponele un nombre a tu Goallet.");
      return;
    }
    if (!meta || meta <= 0) {
      setError("Ingresá un monto meta válido.");
      return;
    }
    if (!aporte || aporte < 10) {
      setError("El aporte mensual mínimo es de $10.");
      return;
    }
    if (!fechaLimite) {
      setError("Elegí una fecha límite para tu objetivo.");
      return;
    }

    const id = crearGoallet({
      nombre: nombre.trim(),
      objetivo: objetivo.trim() || "Objetivo de ahorro personal",
      icono,
      montoMeta: meta,
      aportePeriodicoSugerido: aporte,
      fechaLimite,
      bloqueado,
    });
    router.push(`/goallets/${id}`);
  }

  return (
    <>
      <AppHeader />
      <main className="flex-1 w-full">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-5">
          <Link
            href="/goallets"
            className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors w-fit"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Volver a Mis Goallets
          </Link>
          <div>
            <h1 className="font-headline text-headline-lg text-on-surface tracking-tight">
              Crear un nuevo Goallet
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Definí tu objetivo, el monto meta y en cuánto tiempo querés lograrlo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-on-surface" htmlFor="nombre">
                Nombre del Goallet
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Viaje a Bariloche"
                className="bg-surface-container-low text-on-surface text-sm rounded-sm px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-on-surface" htmlFor="objetivo">
                Objetivo (opcional)
              </label>
              <input
                id="objetivo"
                type="text"
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                placeholder="Ej: Vacaciones familiares en la Patagonia"
                className="bg-surface-container-low text-on-surface text-sm rounded-sm px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-on-surface">Ícono</span>
              <div className="flex flex-wrap gap-2">
                {iconosDisponibles.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcono(ic)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center border transition-colors ${
                      icono === ic
                        ? "border-primary bg-primary-container text-on-primary-container"
                        : "border-outline bg-surface-container-low text-on-surface-variant hover:border-primary"
                    }`}
                    aria-label={ic}
                  >
                    <span className="material-symbols-outlined text-[20px]">{ic}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-on-surface" htmlFor="meta">
                  Monto meta (USD)
                </label>
                <input
                  id="meta"
                  type="number"
                  min={10}
                  step="0.01"
                  value={montoMeta}
                  onChange={(e) => setMontoMeta(e.target.value)}
                  placeholder="1000"
                  className="bg-surface-container-low text-on-surface text-sm rounded-sm px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-on-surface" htmlFor="aporte">
                  Aporte mensual (USD)
                </label>
                <input
                  id="aporte"
                  type="number"
                  min={10}
                  step="0.01"
                  value={aporteMensual}
                  onChange={(e) => setAporteMensual(e.target.value)}
                  placeholder="Mínimo $10"
                  className="bg-surface-container-low text-on-surface text-sm rounded-sm px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-on-surface" htmlFor="fecha">
                Fecha límite del objetivo
              </label>
              <input
                id="fecha"
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                className="bg-surface-container-low text-on-surface text-sm rounded-sm px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <label className="flex items-center gap-3 bg-surface-container-low rounded-sm px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={bloqueado}
                onChange={(e) => setBloqueado(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-on-surface">
                Bloquear el ahorro para ganar una tasa preferencial
              </span>
            </label>

            {error && (
              <p className="text-sm text-error bg-error-container text-on-error-container rounded-sm px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold text-sm px-6 py-3 rounded-sm hover:bg-primary-dark transition-colors shadow-sm active:scale-[0.99]"
            >
              Crear Goallet
            </button>
          </form>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
