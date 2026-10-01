"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useGoalletStore } from "@/lib/store";
import { iconosDisponibles } from "@/lib/mock-data";
import { hoyISO, simular, sumarMeses } from "@/lib/finance";
import { cuentaEtiqueta, dolaresACentavos, formatCentavos, formatTasa } from "@/lib/format";
import type { Icono } from "@/lib/types";

const DIAS_DEBITO = Array.from({ length: 28 }, (_, i) => i + 1);

const inputClass =
  "bg-surface-container-low text-on-surface text-sm rounded-sm px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30";

function NuevoGoalletContent() {
  const router = useRouter();
  const crearPlan = useGoalletStore((s) => s.crearPlan);
  const cuentas = useGoalletStore((s) => s.cuentas);

  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [icono, setIcono] = useState<Icono>(iconosDisponibles[0]);
  const [montoMeta, setMontoMeta] = useState("");
  const [fechaObjetivo, setFechaObjetivo] = useState("");
  const [diaDebito, setDiaDebito] = useState(1);
  const [cuentaDebitoId, setCuentaDebitoId] = useState(cuentas[0]?.id ?? "");
  const [bloqueado, setBloqueado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montoMetaCentavos = dolaresACentavos(Number(montoMeta) || 0);
  // Equivalente a GET /v1/simulaciones: la cuota la calcula el sistema, no el usuario.
  const simulacion = useMemo(
    () => (fechaObjetivo ? simular(montoMetaCentavos, fechaObjetivo, bloqueado) : null),
    [montoMetaCentavos, fechaObjetivo, bloqueado]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Ponle un nombre a tu Goallet.");
      return;
    }
    if (montoMetaCentavos < 1) {
      setError("Ingresa un monto meta válido.");
      return;
    }
    if (!fechaObjetivo) {
      setError("Elige la fecha en la que quieres alcanzar tu meta.");
      return;
    }

    const r = crearPlan({
      nombre: nombre.trim(),
      objetivo: objetivo.trim() || undefined,
      icono,
      montoMetaCentavos,
      fechaObjetivo,
      diaDebito,
      cuentaDebitoId,
      bloqueado,
    });
    if (!r.ok) {
      setError(r.mensaje);
      return;
    }
    router.push(`/goallets/${r.valor}`);
  }

  return (
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
              Define tu objetivo, el monto meta y para cuándo lo quieres. Nosotros calculamos el aporte mensual.
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
                maxLength={60}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Viaje familiar"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-on-surface" htmlFor="objetivo">
                Objetivo (opcional)
              </label>
              <input
                id="objetivo"
                type="text"
                maxLength={140}
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                placeholder="Ej: Vacaciones familiares de una semana"
                className={inputClass}
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
                  min={0.01}
                  step="0.01"
                  value={montoMeta}
                  onChange={(e) => setMontoMeta(e.target.value)}
                  placeholder="1000"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-on-surface" htmlFor="fecha">
                  Fecha objetivo
                </label>
                <input
                  id="fecha"
                  type="date"
                  min={sumarMeses(hoyISO(), 1)}
                  max={sumarMeses(hoyISO(), 120)}
                  value={fechaObjetivo}
                  onChange={(e) => setFechaObjetivo(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-on-surface" htmlFor="cuenta">
                  Cuenta de débito
                </label>
                <select
                  id="cuenta"
                  value={cuentaDebitoId}
                  onChange={(e) => setCuentaDebitoId(e.target.value)}
                  className={inputClass}
                >
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {cuentaEtiqueta(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-on-surface" htmlFor="dia">
                  Día del débito mensual
                </label>
                <select
                  id="dia"
                  value={diaDebito}
                  onChange={(e) => setDiaDebito(Number(e.target.value))}
                  className={inputClass}
                >
                  {DIAS_DEBITO.map((d) => (
                    <option key={d} value={d}>
                      Día {d} de cada mes
                    </option>
                  ))}
                </select>
              </div>
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

            {simulacion && (
              <div className="flex flex-col gap-2 bg-info-container rounded-sm px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wide text-on-info-container">
                  Tu plan
                </span>
                <p className="text-sm text-on-info-container">
                  Aporte mensual de{" "}
                  <span className="font-semibold">{formatCentavos(simulacion.cuotaMensualCentavos)}</span>{" "}
                  durante {simulacion.plazoMeses} {simulacion.plazoMeses === 1 ? "mes" : "meses"}, a{" "}
                  <span className="font-semibold">{formatTasa(simulacion.tasas.totalAnual)} TNA</span> (
                  {formatTasa(simulacion.tasas.efectivaAnual)} TEA).
                </p>
                <p className="text-xs text-on-info-container">
                  Aportarás {formatCentavos(simulacion.totalAportadoCentavos)} y ganarás{" "}
                  {formatCentavos(simulacion.interesesProyectadosCentavos)} en intereses.
                </p>
              </div>
            )}

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
  );
}

export default function NuevoGoalletPage() {
  return (
    <>
      <AppHeader />
      <RequireAuth>
        <NuevoGoalletContent />
      </RequireAuth>
      <AppFooter />
    </>
  );
}
