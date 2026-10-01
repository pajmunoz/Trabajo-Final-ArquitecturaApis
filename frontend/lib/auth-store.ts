import { create } from "zustand";
import { persist } from "zustand/middleware";
import { credencialesMock } from "./mock-data";
import type { Cliente } from "./types";

// Imita POST /v1/auth/token (grantType password) + GET /v1/clientes/me.
// Con la API real, aquí se guardarían el access token y el refresh token.
interface AuthStore {
  usuario: Cliente | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (email: string, contrasena: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      usuario: null,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      login: (email, contrasena) => {
        const encontrado = credencialesMock.find(
          (c) =>
            c.cliente.email.toLowerCase() === email.trim().toLowerCase() &&
            c.contrasena === contrasena
        );
        if (!encontrado) return false;
        set({ usuario: encontrado.cliente });
        return true;
      },

      logout: () => set({ usuario: null }),
    }),
    // Clave nueva: el usuario guardado antes incluía cuentas, tarjetas y contraseña.
    { name: "goallet-auth-v2", skipHydration: true, partialize: (s) => ({ usuario: s.usuario }) }
  )
);
