"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MoneyForm } from "@/components/goallets/MoneyForm";
import { useGoalletStore } from "@/lib/store";

function Contenido() {
  const { id } = useParams<{ id: string }>();
  const goallet = useGoalletStore((s) => s.planes.find((p) => p.id === id));
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    void useGoalletStore.getState().cargarPlan(id).finally(() => setCargado(true));
  }, [id]);

  if (!goallet) {
    return (
      <main className="flex-1 w-full">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
          <p className="text-on-surface-variant">{cargado ? "No encontramos ese Goallet." : "Cargando…"}</p>
        </div>
      </main>
    );
  }

  return (
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
            Aportar a tu {goallet.nombre}
          </h1>
          <MoneyForm goallet={goallet} modo="aportar" />
        </div>
      </main>
  );
}

export default function AportarPage() {
  return (
    <>
      <AppHeader />
      <RequireAuth>
        <Contenido />
      </RequireAuth>
      <AppFooter />
    </>
  );
}
