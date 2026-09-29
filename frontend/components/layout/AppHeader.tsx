import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
      <div className="h-20 max-w-[1360px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link href="/goallets" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-on-primary">
              <span className="material-symbols-outlined text-[20px]">savings</span>
            </span>
            <span className="font-headline text-headline-sm text-on-surface hidden sm:inline">
              Goallet
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-2">
            <Link
              href="/goallets"
              className="font-headline text-sm font-semibold px-4 py-2 rounded-sm bg-primary-container text-on-primary-container transition-colors"
            >
              Mis Goallets
            </Link>
            <Link
              href="/goallets/new"
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors px-4 py-2"
            >
              Nuevo Goallet
            </Link>
          </nav>
        </div>
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
              <span className="text-xs font-semibold text-on-surface">Pablo Jara</span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
                Cliente Goallet
              </span>
            </div>
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline text-xs font-bold">
                PJ
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-surface-container-lowest" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
