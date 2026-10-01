"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { SideDrawer } from "./SideDrawer";

export function AppHeader() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const iniciales = usuario
    ? usuario.nombre
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
        <div className="h-20 max-w-[1360px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {usuario && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Abrir menú"
                className="p-2 -ml-2 rounded-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">menu</span>
              </button>
            )}
            <Link href={usuario ? "/dashboard" : "/login"} className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-on-primary">
                <span className="material-symbols-outlined text-[20px]">savings</span>
              </span>
              <span className="font-headline text-headline-sm text-on-surface hidden sm:inline">
                Goallet
              </span>
            </Link>
          </div>
          {usuario && (
            <div className="flex items-center gap-3">
              <button
                aria-label="Notificaciones"
                className="relative p-2 rounded-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full" />
              </button>
              <div className="flex items-center gap-2 pl-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-on-surface">{usuario.nombre}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
                    Cliente Goallet
                  </span>
                </div>
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline text-xs font-bold">
                    {iniciales}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-surface-container-lowest" />
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Cerrar sesión"
                  className="p-2 rounded-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[22px]">logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {usuario && <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
    </>
  );
}
