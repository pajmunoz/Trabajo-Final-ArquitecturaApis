import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, ApiError, configurarSesion, pedirToken, type Token } from "./api";
import { useGoalletStore } from "./store";
import type { Cliente } from "./types";

// Sesión contra el Servicio de Autenticación: POST /v1/auth/token (password o
// refresh_token) y GET /v1/clientes/me. El access token dura 15 minutos y se
// renueva con el refresh token, que rota en cada uso.
interface AuthStore {
  usuario: Cliente | null;
  accessToken: string | null;
  refreshToken: string | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  /** Devuelve null si inició sesión o el mensaje de error. */
  login: (email: string, contrasena: string) => Promise<string | null>;
  renovar: () => Promise<boolean>;
  logout: () => void;
}

let renovacionEnCurso: Promise<boolean> | null = null;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      usuario: null,
      accessToken: null,
      refreshToken: null,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      login: async (email, contrasena) => {
        try {
          const token: Token = await pedirToken({ grantType: "password", email: email.trim(), contrasena });
          set({ accessToken: token.accessToken, refreshToken: token.refreshToken });
          const usuario = await api<Cliente>("/v1/clientes/me");
          set({ usuario });
          return null;
        } catch (error) {
          set({ accessToken: null, refreshToken: null, usuario: null });
          if (error instanceof ApiError && error.codigo === "CREDENCIALES_INVALIDAS") {
            return "Email o contraseña incorrectos.";
          }
          return error instanceof Error ? error.message : "No se pudo iniciar sesión.";
        }
      },

      // Varias peticiones pueden recibir 401 a la vez: se comparte una sola renovación.
      renovar: () => {
        renovacionEnCurso ??= (async () => {
          const refreshToken = get().refreshToken;
          if (!refreshToken) return false;
          try {
            const token = await pedirToken({ grantType: "refresh_token", refreshToken });
            set({ accessToken: token.accessToken, refreshToken: token.refreshToken });
            return true;
          } catch {
            return false;
          } finally {
            renovacionEnCurso = null;
          }
        })();
        return renovacionEnCurso;
      },

      logout: () => {
        set({ usuario: null, accessToken: null, refreshToken: null });
        useGoalletStore.getState().limpiar();
      },
    }),
    {
      name: "goallet-auth-v3",
      skipHydration: true,
      partialize: (s) => ({ usuario: s.usuario, accessToken: s.accessToken, refreshToken: s.refreshToken }),
    }
  )
);

configurarSesion({
  accessToken: () => useAuthStore.getState().accessToken,
  renovar: () => useAuthStore.getState().renovar(),
  cerrar: () => useAuthStore.getState().logout(),
});
