import { create } from "zustand";
import { persist } from "zustand/middleware";
import { usuariosMock } from "./mock-data";
import type { Usuario } from "./types";

interface AuthStore {
  usuario: Usuario | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      usuario: null,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      login: (email, password) => {
        const encontrado = usuariosMock.find(
          (u) =>
            u.email.toLowerCase() === email.trim().toLowerCase() &&
            u.password === password
        );
        if (!encontrado) return false;
        set({ usuario: encontrado });
        return true;
      },

      logout: () => set({ usuario: null }),
    }),
    { name: "goallet-auth", skipHydration: true }
  )
);
