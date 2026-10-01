"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  icon: string;
  href: string | null;
}

const navItems: NavItem[] = [
  { label: "Resumen", icon: "dashboard", href: "/dashboard" },
  { label: "Cuentas", icon: "account_balance_wallet", href: null },
  { label: "Goallets", icon: "savings", href: "/goallets" },
  { label: "Transferencias", icon: "swap_horiz", href: null },
  { label: "Tarjetas", icon: "credit_card", href: null },
  { label: "Pago de Servicios", icon: "receipt_long", href: null },
];

export function SideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className={`fixed top-0 left-0 z-[70] h-full w-[85vw] max-w-80 bg-surface-container-lowest shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-20 flex items-center justify-between gap-3 px-5 shrink-0">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-on-primary">
              <span className="material-symbols-outlined text-[20px]">savings</span>
            </span>
            <span className="font-headline text-headline-sm text-on-surface">Goallet</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-2 rounded-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = !!item.href && pathname.startsWith(item.href);

            if (!item.href) {
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-sm text-on-surface-variant/60 cursor-not-allowed"
                >
                  <span className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-surface-container px-2 py-0.5 rounded-full">
                    Pronto
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${
                  isActive
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
