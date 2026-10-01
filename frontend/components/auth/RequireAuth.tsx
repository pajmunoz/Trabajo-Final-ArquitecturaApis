"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !usuario) {
      router.replace("/login");
    }
  }, [hasHydrated, usuario, router]);

  if (!hasHydrated || !usuario) {
    return (
      <main className="flex-1 w-full flex items-center justify-center py-24">
        <span className="material-symbols-outlined text-[32px] text-primary animate-spin">
          progress_activity
        </span>
      </main>
    );
  }

  return <>{children}</>;
}
