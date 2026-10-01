"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { MoneyForm } from "@/components/goallets/MoneyForm";
import { useGoalletStore } from "@/lib/store";

export default function RetirarPage() {
  const { id } = useParams<{ id: string }>();
  const goallet = useGoalletStore((s) => s.planes.find((p) => p.id === id));

  if (!goallet) {
    return (
      <>
        <AppHeader />
        <main className="flex-1 w-full">
          <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
            <p className="text-on-surface-variant">No encontramos ese Goallet.</p>
          </div>
        </main>
        <AppFooter />
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="flex-1 w-full">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-5">
          <Link
            href={`/goallets/${goallet.id}`}
            className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors w-fit"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Volver a {goallet.nombre}
          </Link>
          <h1 className="font-headline text-headline-lg text-on-surface tracking-tight">
            Retirar fondos de {goallet.nombre}
          </h1>
          {goallet.bloqueado && (
            <p className="text-sm text-on-error-container bg-error-container rounded-sm px-4 py-3">
              Este Goallet tiene los fondos bloqueados para obtener una tasa preferencial y no admite
              retiros. Si necesitas el dinero, primero desbloquéalo desde el detalle del Goallet
              (pierdes los intereses devengados).
            </p>
          )}
          <MoneyForm goallet={goallet} modo="retirar" />
        </div>
      </main>
      <AppFooter />
    </>
  );
}
