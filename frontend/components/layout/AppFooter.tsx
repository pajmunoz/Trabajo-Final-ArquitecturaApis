export function AppFooter() {
  return (
    <footer className="w-full bg-surface-container-low py-6 mt-auto">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-[11px] uppercase tracking-wide text-on-surface-variant">
          © 2026 Goallet. Proyecto académico — Diseño y Desarrollo de APIs.
        </span>
        <div className="flex items-center gap-6">
          <span className="text-sm text-on-surface-variant">Ayuda y Soporte</span>
          <span className="text-sm text-on-surface-variant">Seguridad</span>
          <span className="text-sm text-on-surface-variant">Términos</span>
        </div>
      </div>
    </footer>
  );
}
