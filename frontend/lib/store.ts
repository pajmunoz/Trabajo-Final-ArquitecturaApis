import { create } from "zustand";
import { persist } from "zustand/middleware";
import { goalletsIniciales } from "./mock-data";
import type { Goallet, NuevoGoalletInput } from "./types";

function nuevoId(nombre: string) {
  const slug = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug || "goallet"}-${Date.now().toString(36)}`;
}

interface GoalletStore {
  goallets: Goallet[];
  getGoallet: (id: string) => Goallet | undefined;
  crearGoallet: (input: NuevoGoalletInput) => string;
  aportar: (id: string, monto: number, origen: string) => void;
  retirar: (id: string, monto: number) => void;
  toggleBooster: (id: string, boosterId: string) => void;
  desbloquear: (id: string) => void;
}

const TASA_BASE_TNA = 4.5;
const TASA_BASE_TEA = 4.6;
const BONUS_BLOQUEO_TNA = 1.1;
const BONUS_BLOQUEO_TEA = 1.15;

export const useGoalletStore = create<GoalletStore>()(
  persist(
    (set, get) => ({
      goallets: goalletsIniciales,

      getGoallet: (id) => get().goallets.find((g) => g.id === id),

      crearGoallet: (input) => {
        const id = nuevoId(input.nombre);
        const nuevo: Goallet = {
          id,
          nombre: input.nombre,
          objetivo: input.objetivo,
          icono: input.icono,
          montoMeta: input.montoMeta,
          montoActual: 0,
          aportePeriodicoSugerido: input.aportePeriodicoSugerido,
          tasaTNA: input.bloqueado ? TASA_BASE_TNA + BONUS_BLOQUEO_TNA : TASA_BASE_TNA,
          tasaTEA: input.bloqueado ? TASA_BASE_TEA + BONUS_BLOQUEO_TEA : TASA_BASE_TEA,
          bloqueado: input.bloqueado,
          tasaTNASinBloqueo: input.bloqueado ? TASA_BASE_TNA : undefined,
          tasaTEASinBloqueo: input.bloqueado ? TASA_BASE_TEA : undefined,
          fechaLimite: input.fechaLimite,
          creadoEn: new Date().toISOString(),
          boosters: [
            {
              id: "ahorro-mensual",
              titulo: "Ahorro mensual",
              descripcion: `Aporta $${input.aportePeriodicoSugerido.toFixed(2)} todos los meses para alcanzar tu meta a tiempo.`,
              icono: "calendar_today",
              activo: false,
              etiqueta: "DISPONIBLE",
            },
            ...(input.bloqueado
              ? [
                  {
                    id: "blindaje-tasa",
                    titulo: "Blinda tu tasa",
                    descripcion: `Fondos bloqueados con rendimiento extra garantizado de ${(TASA_BASE_TNA + BONUS_BLOQUEO_TNA).toFixed(2)}% TNA.`,
                    icono: "lock_clock",
                    activo: true,
                    etiqueta: "ACTIVO",
                  },
                ]
              : []),
          ],
          movimientos: [],
        };
        set((state) => ({ goallets: [nuevo, ...state.goallets] }));
        return id;
      },

      aportar: (id, monto, origen) => {
        set((state) => ({
          goallets: state.goallets.map((g) => {
            if (g.id !== id) return g;
            const saldoResultante = g.montoActual + monto;
            return {
              ...g,
              montoActual: saldoResultante,
              movimientos: [
                {
                  id: `m-${Date.now()}`,
                  tipo: "aporte",
                  descripcion: "Aporte manual",
                  origen,
                  monto,
                  fecha: new Date().toISOString(),
                  saldoResultante,
                },
                ...g.movimientos,
              ],
            };
          }),
        }));
      },

      retirar: (id, monto) => {
        set((state) => ({
          goallets: state.goallets.map((g) => {
            if (g.id !== id || g.bloqueado) return g;
            const saldoResultante = Math.max(0, g.montoActual - monto);
            return {
              ...g,
              montoActual: saldoResultante,
              movimientos: [
                {
                  id: `m-${Date.now()}`,
                  tipo: "retiro",
                  descripcion: "Retiro de fondos",
                  origen: "Cuenta propia",
                  monto: -monto,
                  fecha: new Date().toISOString(),
                  saldoResultante,
                },
                ...g.movimientos,
              ],
            };
          }),
        }));
      },

      toggleBooster: (id, boosterId) => {
        set((state) => ({
          goallets: state.goallets.map((g) => {
            if (g.id !== id) return g;
            return {
              ...g,
              boosters: g.boosters.map((b) =>
                b.id === boosterId
                  ? {
                      ...b,
                      activo: !b.activo,
                      etiqueta: !b.activo ? "ACTIVO" : "DISPONIBLE",
                    }
                  : b
              ),
            };
          }),
        }));
      },

      desbloquear: (id) => {
        set((state) => ({
          goallets: state.goallets.map((g) => {
            if (g.id !== id || !g.bloqueado) return g;
            return {
              ...g,
              bloqueado: false,
              tasaTNA: g.tasaTNASinBloqueo ?? g.tasaTNA,
              tasaTEA: g.tasaTEASinBloqueo ?? g.tasaTEA,
              tasaTNASinBloqueo: undefined,
              tasaTEASinBloqueo: undefined,
              boosters: g.boosters.map((b) =>
                b.id === "blindaje-tasa"
                  ? { ...b, activo: false, etiqueta: "DISPONIBLE" }
                  : b
              ),
            };
          }),
        }));
      },
    }),
    { name: "goallet-storage", skipHydration: true }
  )
);
