"use client";

import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { GoalletCard } from "@/components/goallets/GoalletCard";
import { useGoalletStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";

function GoalletsContent() {
  const goallets = useGoalletStore((s) => s.goallets);
  const totalAhorrado = goallets.reduce((acc, g) => acc + g.montoActual, 0);
  const totalMeta = goallets.reduce((acc, g) => acc + g.montoMeta, 0);

  return (
      <main className="flex-1 w-full">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors w-fit"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Volver al Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-headline text-headline-lg text-on-surface tracking-tight">
                Mis Goallets
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Cada objetivo de ahorro, en su propia billetera.
              </p>
            </div>
            <Link
              href="/goallets/new"
              className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary text-sm font-semibold px-5 py-3 rounded-sm hover:bg-primary-dark transition-colors shadow-sm active:scale-[0.99] self-start"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Nuevo Goallet
            </Link>
          </div>

          <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Total ahorrado en todos tus Goallets
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline text-currency text-on-surface">
                  {formatMoney(totalAhorrado)}
                </span>
                <span className="text-sm text-on-surface-variant">
                  de {formatMoney(totalMeta)} en metas
                </span>
              </div>
            </div>
            <span className="text-sm text-on-surface-variant">
              {goallets.length} {goallets.length === 1 ? "Goallet activo" : "Goallets activos"}
            </span>
          </div>

          {goallets.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-lg p-10 shadow-sm text-center flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-[40px] text-primary">savings</span>
              <p className="text-on-surface-variant">Todavía no creaste ningún Goallet.</p>
              <Link
                href="/goallets/new"
                className="inline-flex items-center gap-2 bg-primary text-on-primary text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-primary-dark transition-colors"
              >
                Crear mi primer Goallet
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {goallets.map((goallet) => (
                <GoalletCard key={goallet.id} goallet={goallet} />
              ))}
            </div>
          )}
        </div>
      </main>
  );
}

export default function GoalletsPage() {
  return (
    <>
      <AppHeader />
      <RequireAuth>
        <GoalletsContent />
      </RequireAuth>
      <AppFooter />
    </>
  );
}
