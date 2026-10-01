"use client";

import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { CreditCardCarousel } from "@/components/dashboard/CreditCardCarousel";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { GoalletCard } from "@/components/goallets/GoalletCard";
import { useAuthStore } from "@/lib/auth-store";
import { useGoalletStore } from "@/lib/store";
import { tarjetasMock } from "@/lib/mock-data";
import { formatCentavos } from "@/lib/format";

function DashboardContent() {
  const usuario = useAuthStore((s) => s.usuario);
  const planes = useGoalletStore((s) => s.planes);
  const cuentas = useGoalletStore((s) => s.cuentas);
  const resumen = useGoalletStore((s) => s.resumen)();

  if (!usuario) return null;

  const totalCuentas = cuentas.reduce((acc, c) => acc + (c.saldoDisponibleCentavos ?? 0), 0);
  const goalletsDestacados = planes.filter((p) => p.estado === "ACTIVO").slice(0, 3);

  return (
    <main className="flex-1 w-full">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface tracking-tight">
            Hola, {usuario.nombre.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Este es el resumen de tu actividad bancaria.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Saldo total en cuentas (USD)
            </span>
            <span className="font-headline text-currency text-on-surface">
              {formatCentavos(totalCuentas)}
            </span>
          </div>
          <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Total ahorrado en Goallets
            </span>
            <span className="font-headline text-currency text-on-surface">
              {formatCentavos(resumen.totalAhorradoCentavos)}
            </span>
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-headline text-headline-sm text-on-surface">Mis tarjetas de crédito</h2>
          <CreditCardCarousel tarjetas={tarjetasMock} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-headline text-headline-sm text-on-surface">Cuentas activas</h2>
          <div className="flex flex-col gap-3">
            {cuentas.map((cuenta) => (
              <AccountCard key={cuenta.id} cuenta={cuenta} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-headline text-headline-sm text-on-surface">Mis Goallets</h2>
            <Link
              href="/goallets"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Ver todos mis Goallets
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          {goalletsDestacados.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-lg p-8 shadow-sm text-center flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-[36px] text-primary">savings</span>
              <p className="text-on-surface-variant">Todavía no has creado ningún Goallet.</p>
              <Link
                href="/goallets/new"
                className="inline-flex items-center gap-2 bg-primary text-on-primary text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-primary-dark transition-colors"
              >
                Crear mi primer Goallet
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {goalletsDestacados.map((goallet) => (
                <GoalletCard key={goallet.id} goallet={goallet} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <>
      <AppHeader />
      <RequireAuth>
        <DashboardContent />
      </RequireAuth>
      <AppFooter />
    </>
  );
}
