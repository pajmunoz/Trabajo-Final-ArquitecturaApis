"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { BalanceHero } from "@/components/goallets/BalanceHero";
import { BoosterCard } from "@/components/goallets/BoosterCard";
import { ProgressBar } from "@/components/goallets/ProgressBar";
import { TransactionRow } from "@/components/goallets/TransactionRow";
import { UnlockFundsPanel } from "@/components/goallets/UnlockFundsPanel";
import { useGoalletStore } from "@/lib/store";
import { formatDate, formatMoney } from "@/lib/format";

export default function GoalletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const goallet = useGoalletStore((s) => s.goallets.find((g) => g.id === id));
  const toggleBooster = useGoalletStore((s) => s.toggleBooster);

  if (!goallet) {
    return (
      <>
        <AppHeader />
        <main className="flex-1 w-full">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
            <p className="text-on-surface-variant">No encontramos ese Goallet.</p>
            <Link href="/goallets" className="text-primary font-semibold hover:underline">
              Volver a Mis Goallets
            </Link>
          </div>
        </main>
        <AppFooter />
      </>
    );
  }

  const percent = (goallet.montoActual / goallet.montoMeta) * 100;
  const faltante = Math.max(0, goallet.montoMeta - goallet.montoActual);

  return (
    <>
      <AppHeader />
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
            </div>
            <p className="text-sm text-on-surface-variant">{goallet.objetivo}</p>
          </div>

          <BalanceHero goallet={goallet} />

          {goallet.bloqueado && <UnlockFundsPanel goallet={goallet} />}

          <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-headline text-headline-sm text-on-surface">Progreso de la meta</h2>
                <p className="text-xs text-on-surface-variant">
                  Fecha límite: {formatDate(goallet.fechaLimite)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="font-headline text-headline-sm text-on-surface font-bold">
                  ${formatMoney(goallet.montoActual)}
                </span>
                <span className="text-sm text-on-surface-variant"> de ${formatMoney(goallet.montoMeta)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <ProgressBar percent={percent} />
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>0%</span>
                <span className="font-bold text-primary text-sm">{percent.toFixed(0)}% completado</span>
                <span>Meta: ${formatMoney(goallet.montoMeta)}</span>
              </div>
            </div>
            {faltante > 0 && (
              <div className="flex items-center gap-2.5 bg-info-container px-4 py-3 rounded-sm">
                <span className="material-symbols-outlined text-on-info-container text-[20px]">timelapse</span>
                <p className="text-sm text-on-info-container">
                  Te faltan <span className="font-semibold">${formatMoney(faltante)}</span> para alcanzar tu objetivo.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-headline-sm text-on-surface">Potenciadores de Ahorro</h2>
              <span className="text-sm text-on-surface-variant">Reglas automáticas inteligentes</span>
            </div>
            {goallet.boosters.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                Este Goallet todavía no tiene potenciadores configurados.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {goallet.boosters.map((booster) => (
                  <BoosterCard
                    key={booster.id}
                    booster={booster}
                    onToggle={() => toggleBooster(goallet.id, booster.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col gap-3">
            <div>
              <h2 className="font-headline text-headline-sm text-on-surface">Historial de movimientos</h2>
              <p className="text-xs text-on-surface-variant">Aportes, retiros y rendimientos de este Goallet</p>
            </div>
            {goallet.movimientos.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-4">Todavía no hay movimientos.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {goallet.movimientos.map((movimiento) => (
                  <TransactionRow key={movimiento.id} movimiento={movimiento} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
