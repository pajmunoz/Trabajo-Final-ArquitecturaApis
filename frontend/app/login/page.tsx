"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const usuario = useAuthStore((s) => s.usuario);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const [email, setEmail] = useState("pablo.jara@email.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (hasHydrated && usuario) {
      router.replace("/dashboard");
    }
  }, [hasHydrated, usuario, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const mensaje = await login(email, password);
    setEnviando(false);
    if (mensaje) {
      setError(mensaje);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex-1 w-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-primary text-on-primary">
            <span className="material-symbols-outlined text-[28px]">savings</span>
          </span>
          <div>
            <h1 className="font-headline text-headline-lg text-on-surface tracking-tight">
              Ingresa a Goallet
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Tu banca digital y tus metas de ahorro, en un solo lugar.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest rounded-lg p-6 shadow-sm flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-on-surface" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.email@ejemplo.com"
              className="bg-surface-container-low text-on-surface text-sm rounded-sm px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-on-surface" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-surface-container-low text-on-surface text-sm rounded-sm px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {error && (
            <p className="text-sm text-error bg-error-container text-on-error-container rounded-sm px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="disabled:opacity-60 disabled:cursor-wait inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold text-sm px-6 py-3 rounded-sm hover:bg-primary-dark transition-colors shadow-sm active:scale-[0.99]"
          >
            {enviando ? "Ingresando…" : "Ingresar"}
          </button>

          <div className="flex items-center gap-2.5 bg-info-container px-4 py-3 rounded-sm">
            <span className="material-symbols-outlined text-on-info-container text-[20px]">info</span>
            <p className="text-xs text-on-info-container">
              Demo: <span className="font-semibold">pablo.jara@email.com</span> / contraseña{" "}
              <span className="font-semibold">goallet123</span>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
