"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { BalanceHero } from "@/components/goallets/BalanceHero";
import { BoosterCard } from "@/components/goallets/BoosterCard";
import { CancelPlanPanel } from "@/components/goallets/CancelPlanPanel";
import { ProgressBar } from "@/components/goallets/ProgressBar";
import { TransactionRow } from "@/components/goallets/TransactionRow";
import { UnlockFundsPanel } from "@/components/goallets/UnlockFundsPanel";
import { useGoalletStore } from "@/lib/store";
import { calcularTasas } from "@/lib/finance";
import { cuentaEtiqueta, formatCentavos, formatDate, formatTasa } from "@/lib/format";
import type { Movimiento } from "@/lib/types";

const SIN_MOVIMIENTOS: Movimiento[] = [];

function GoalletDetailContent() {
  const { id } = useParams<{ id: string }>();
  const goallet = useGoalletStore((s) => s.planes.find((p) => p.id === id));
  const movimientos = useGoalletStore((s) => s.movimientos[id] ?? SIN_MOVIMIENTOS);
  const bloquear = useGoalletStore((s) => s.bloquear);

  if (!goallet) {
    return (
      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <p className="text-on-surface-variant">No encontramos ese Goallet.</p>
          <Link href="/goallets" className="text-primary font-semibold hover:underline">
            Volver a Mis Goallets
          </Link>
        </div>
      </main>
    );
  }

  const activo = goallet.estado === "ACTIVO";
  const faltante = Math.max(0, goallet.montoMetaCentavos - goallet.saldoCentavos);
  const bonoDisponible = calcularTasas(goallet.plazoMeses, true).bonoBloqueoAnual;
  const prorrogado = goallet.fechaFinEstimada !== goallet.fechaObjetivo;

  return (
      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <Link
              href="/goallets"
              className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors w-fit"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Volver a Mis Goallets
            </Link>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <h1 className="font-headline text-headline-lg text-on-surface tracking-tight">
                {goallet.nombre}
              </h1>
              {goallet.bloqueado && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-on-secondary-container bg-secondary-container px-2.5 py-1 rounded-full">
                  Fondos bloqueados
                </span>
              )}
              {!activo && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
                  {goallet.estado === "COMPLETADO" ? "Completado" : "Cancelado"}
                </span>
              )}
            </div>
            {goallet.objetivo && <p className="text-sm text-on-surface-variant">{goallet.objetivo}</p>}
          </div>

          <BalanceHero goallet={goallet} movimientos={movimientos} />

          {activo && goallet.bloqueado && <UnlockFundsPanel goallet={goallet} />}

          <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-headline text-headline-sm text-on-surface">Progreso de la meta</h2>
                <p className="text-xs text-on-surface-variant">
                  Fecha objetivo: {formatDate(goallet.fechaObjetivo)}
                  {prorrogado && ` · Fin estimado: ${formatDate(goallet.fechaFinEstimada)}`}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="font-headline text-headline-sm text-on-surface font-bold">
                  {formatCentavos(goallet.saldoCentavos)}
                </span>
                <span className="text-sm text-on-surface-variant"> de {formatCentavos(goallet.montoMetaCentavos)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <ProgressBar percent={goallet.progreso} />
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>0%</span>
                <span className="font-bold text-primary text-sm">{goallet.progreso.toFixed(0)}% completado</span>
                <span>Meta: {formatCentavos(goallet.montoMetaCentavos)}</span>
              </div>
            </div>
            {activo && faltante > 0 && (
              <div className="flex items-center gap-2.5 bg-info-container px-4 py-3 rounded-sm">
                <span className="material-symbols-outlined text-on-info-container text-[20px]">timelapse</span>
                <p className="text-sm text-on-info-container">
                  Te faltan <span className="font-semibold">{formatCentavos(faltante)}</span> para alcanzar tu objetivo.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-headline-sm text-on-surface">Potenciadores de Ahorro</h2>
              <span className="text-sm text-on-surface-variant">Reglas automáticas inteligentes</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BoosterCard
                booster={{
                  id: "ahorro-mensual",
                  titulo: "Ahorro mensual",
                  descripcion: `Débito automático de ${formatCentavos(goallet.cuotaMensualCentavos)} el día ${goallet.diaDebito} de cada mes desde ${cuentaEtiqueta(goallet.cuentaDebito)}.`,
                  icono: "calendar_today",
                  activo,
                  etiqueta: activo ? "ACTIVO" : "FINALIZADO",
                }}
                ayuda={goallet.proximoDebito ? `Próximo débito: ${formatDate(goallet.proximoDebito)}` : undefined}
              />
              <BoosterCard
                booster={{
                  id: "blindaje-tasa",
                  titulo: "Blinda tu tasa",
                  descripcion: goallet.bloqueado
                    ? `Fondos bloqueados con ${formatTasa(goallet.tasas.totalAnual)} TNA (base ${formatTasa(goallet.tasas.baseAnual)} + bono ${formatTasa(goallet.tasas.bonoBloqueoAnual)}).`
                    : `Bloquea tus fondos y suma ${formatTasa(bonoDisponible)} de TNA a tu tasa actual de ${formatTasa(goallet.tasas.totalAnual)}.`,
                  icono: "lock_clock",
                  activo: goallet.bloqueado,
                  etiqueta: goallet.bloqueado ? "ACTIVO" : "DISPONIBLE",
                }}
                onToggle={activo && !goallet.bloqueado ? () => bloquear(goallet.id) : undefined}
                ayuda={
                  activo && goallet.bloqueado
                    ? "Para salir del bloqueo, usa “Desbloquear fondos”."
                    : undefined
                }
              />
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col gap-3">
            <div>
              <h2 className="font-headline text-headline-sm text-on-surface">Historial de movimientos</h2>
              <p className="text-xs text-on-surface-variant">Aportes, retiros y rendimientos de este Goallet</p>
            </div>
            {movimientos.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-4">Todavía no hay movimientos.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {movimientos.map((movimiento) => (
                  <TransactionRow key={movimiento.id} movimiento={movimiento} />
                ))}
              </div>
            )}
          </div>

          {activo && <CancelPlanPanel goallet={goallet} />}
        </div>
      </main>
  );
}

export default function GoalletDetailPage() {
  return (
    <>
      <AppHeader />
      <RequireAuth>
        <GoalletDetailContent />
      </RequireAuth>
      <AppFooter />
    </>
  );
}
