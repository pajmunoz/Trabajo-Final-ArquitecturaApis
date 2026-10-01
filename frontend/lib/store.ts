// Estado del front conectado a la API (contracts/openapi.yaml). Cada acción llama a
// un endpoint; los aportes y retiros son asíncronos (202): se consulta su estado
// hasta que el Core los confirma y luego se recargan el plan, el historial y las cuentas.
import { create } from "zustand";
import { api, ApiError, solicitud } from "./api";
import type {
  CrearPlanAhorro,
  CuentaDebito,
  EstadoDebito,
  Movimiento,
  PlanAhorro,
  ResumenPlanes,
  TablaTarifas,
} from "./types";

export type Resultado<T = undefined> =
  | ({ ok: true; aviso?: string } & (T extends undefined ? object : { valor: T }))
  | { ok: false; codigo: string; mensaje: string };

type Fallo = { ok: false; codigo: string; mensaje: string };

function fallo(error: unknown): Fallo {
  if (error instanceof ApiError) return { ok: false, codigo: error.codigo, mensaje: error.message };
  return { ok: false, codigo: "ERROR", mensaje: "Ocurrió un error inesperado." };
}

interface PaginaOffset<T> {
  items: T[];
  pagina: number;
  limite: number;
  totalElementos: number;
  totalPaginas: number;
}

interface PaginaCursor<T> {
  items: T[];
  siguienteCursor: string | null;
  hayMas: boolean;
}

interface OperacionCore {
  id: string;
  estado: EstadoDebito;
  motivoFallo: string | null;
}

export interface HistorialPlan {
  items: Movimiento[];
  siguienteCursor: string | null;
  hayMas: boolean;
}

const MOTIVOS: Record<string, string> = {
  FONDOS_INSUFICIENTES: "La cuenta no tiene saldo suficiente.",
  CUENTA_BLOQUEADA: "La cuenta está bloqueada en el banco.",
  CORE_NO_DISPONIBLE: "El banco no estuvo disponible; intenta de nuevo más tarde.",
};

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Consulta una operación asíncrona (aporte o retiro) hasta que deja de estar PENDIENTE. */
async function esperarConfirmacion(ruta: string, limiteMs = 15_000): Promise<OperacionCore | null> {
  const fin = Date.now() + limiteMs;
  while (Date.now() < fin) {
    await esperar(800);
    const op = await api<OperacionCore>(ruta);
    if (op.estado !== "PENDIENTE") return op;
  }
  return null;
}

interface GoalletStore {
  planes: PlanAhorro[];
  resumen: ResumenPlanes | null;
  cuentas: CuentaDebito[];
  tarifas: TablaTarifas | null;
  historial: Record<string, HistorialPlan>;
  planesCargados: boolean;
  cargando: boolean;
  error: string | null;

  cargarPlanes: () => Promise<void>;
  cargarPlan: (planId: string) => Promise<void>;
  cargarCuentas: () => Promise<void>;
  cargarTarifas: () => Promise<void>;
  cargarMovimientos: (planId: string, siguiente?: boolean) => Promise<void>;
  crearPlan: (input: CrearPlanAhorro) => Promise<Resultado<string>>;
  aportar: (planId: string, montoCentavos: number, cuentaOrigenId: string) => Promise<Resultado>;
  retirar: (planId: string, montoCentavos: number, cuentaDestinoId: string) => Promise<Resultado>;
  bloquear: (planId: string) => Promise<Resultado>;
  desbloquear: (planId: string) => Promise<Resultado<number>>;
  cancelar: (planId: string, cuentaDestinoId?: string) => Promise<Resultado<number>>;
  limpiar: () => void;
}

export const useGoalletStore = create<GoalletStore>()((set, get) => {
  const reemplazarPlan = (plan: PlanAhorro) =>
    set((s) => ({
      planes: s.planes.some((p) => p.id === plan.id)
        ? s.planes.map((p) => (p.id === plan.id ? plan : p))
        : [plan, ...s.planes],
    }));

  /** Después de mover dinero cambian el plan, su historial, el resumen y los saldos de las cuentas. */
  const refrescarTras = async (planId: string) => {
    await Promise.all([get().cargarPlan(planId), get().cargarMovimientos(planId), get().cargarPlanes(), get().cargarCuentas()]);
  };

  /** POST que responde 202 + Location: espera la confirmación del Core. */
  const moverDinero = async (planId: string, ruta: string, cuerpo: object): Promise<Resultado> => {
    try {
      const { headers, datos } = await solicitud<OperacionCore>(ruta, { metodo: "POST", cuerpo, idempotente: true });
      const ubicacion = headers.get("Location") ?? `${ruta}/${datos.id}`;
      const final = await esperarConfirmacion(ubicacion);
      await refrescarTras(planId);
      if (!final) return { ok: true, aviso: "El banco sigue procesando la operación; se reflejará en unos segundos." };
      if (final.estado === "FALLIDO") {
        const motivo = final.motivoFallo ?? "FALLIDO";
        return { ok: false, codigo: motivo, mensaje: MOTIVOS[motivo] ?? "El banco rechazó la operación." };
      }
      return { ok: true };
    } catch (error) {
      return fallo(error);
    }
  };

  return {
    planes: [],
    resumen: null,
    cuentas: [],
    tarifas: null,
    historial: {},
    planesCargados: false,
    cargando: false,
    error: null,

    // GET /v1/planes-ahorro (paginación offset); incluye el resumen de todos los planes
    cargarPlanes: async () => {
      set({ cargando: true, error: null });
      try {
        const pagina = await api<PaginaOffset<PlanAhorro> & { resumen: ResumenPlanes }>(
          "/v1/planes-ahorro?limite=50&orden=-creadoEn"
        );
        set({ planes: pagina.items, resumen: pagina.resumen, planesCargados: true, cargando: false });
      } catch (error) {
        set({ cargando: false, error: fallo(error).mensaje });
      }
    },

    // GET /v1/planes-ahorro/{planId}
    cargarPlan: async (planId) => {
      try {
        reemplazarPlan(await api<PlanAhorro>(`/v1/planes-ahorro/${planId}`));
      } catch (error) {
        set({ error: fallo(error).mensaje });
      }
    },

    // GET /v1/cuentas-debito (camino síncrono hacia el Core)
    cargarCuentas: async () => {
      try {
        const { items } = await api<{ items: CuentaDebito[] }>("/v1/cuentas-debito");
        set({ cuentas: items });
      } catch (error) {
        set({ error: fallo(error).mensaje });
      }
    },

    // GET /v1/tarifas (público, cacheado por el Gateway)
    cargarTarifas: async () => {
      if (get().tarifas) return;
      try {
        set({ tarifas: await api<TablaTarifas>("/v1/tarifas", { autenticado: false }) });
      } catch {
        /* sin tarifas solo se omite el texto del bono */
      }
    },

    // GET /v1/planes-ahorro/{planId}/movimientos (paginación por cursor)
    cargarMovimientos: async (planId, siguiente = false) => {
      const actual = get().historial[planId];
      const cursor =
        siguiente && actual?.siguienteCursor ? `&cursor=${encodeURIComponent(actual.siguienteCursor)}` : "";
      try {
        const pagina = await api<PaginaCursor<Movimiento>>(`/v1/planes-ahorro/${planId}/movimientos?limite=10${cursor}`);
        set((s) => ({
          historial: {
            ...s.historial,
            [planId]: {
              items: siguiente && actual ? [...actual.items, ...pagina.items] : pagina.items,
              siguienteCursor: pagina.siguienteCursor,
              hayMas: pagina.hayMas,
            },
          },
        }));
      } catch (error) {
        set({ error: fallo(error).mensaje });
      }
    },

    // POST /v1/planes-ahorro (Idempotency-Key)
    crearPlan: async (input) => {
      try {
        const plan = await api<PlanAhorro>("/v1/planes-ahorro", { metodo: "POST", cuerpo: input, idempotente: true });
        reemplazarPlan(plan);
        void get().cargarPlanes();
        return { ok: true, valor: plan.id };
      } catch (error) {
        return fallo(error);
      }
    },

    // POST /v1/planes-ahorro/{planId}/aportes → 202
    aportar: (planId, montoCentavos, cuentaOrigenId) =>
      moverDinero(planId, `/v1/planes-ahorro/${planId}/aportes`, { montoCentavos, cuentaOrigenId }),

    // POST /v1/planes-ahorro/{planId}/retiros → 202
    retirar: (planId, montoCentavos, cuentaDestinoId) =>
      moverDinero(planId, `/v1/planes-ahorro/${planId}/retiros`, { montoCentavos, cuentaDestinoId }),

    // POST /v1/planes-ahorro/{planId}/bloqueo
    bloquear: async (planId) => {
      try {
        reemplazarPlan(await api<PlanAhorro>(`/v1/planes-ahorro/${planId}/bloqueo`, { metodo: "POST" }));
        return { ok: true };
      } catch (error) {
        return fallo(error);
      }
    },

    // POST /v1/planes-ahorro/{planId}/desbloqueo (Idempotency-Key)
    desbloquear: async (planId) => {
      try {
        const r = await api<{ plan: PlanAhorro; interesesPerdidosCentavos: number }>(
          `/v1/planes-ahorro/${planId}/desbloqueo`,
          { metodo: "POST", idempotente: true }
        );
        reemplazarPlan(r.plan);
        void get().cargarMovimientos(planId);
        return { ok: true, valor: r.interesesPerdidosCentavos };
      } catch (error) {
        return fallo(error);
      }
    },

    // POST /v1/planes-ahorro/{planId}/cancelacion (Idempotency-Key); la devolución al Core es asíncrona
    cancelar: async (planId, cuentaDestinoId) => {
      try {
        const r = await api<{ plan: PlanAhorro; montoDevueltoCentavos: number }>(
          `/v1/planes-ahorro/${planId}/cancelacion`,
          { metodo: "POST", cuerpo: cuentaDestinoId ? { cuentaDestinoId } : {}, idempotente: true }
        );
        reemplazarPlan(r.plan);
        setTimeout(() => void refrescarTras(planId), 2500);
        return { ok: true, valor: r.montoDevueltoCentavos };
      } catch (error) {
        return fallo(error);
      }
    },

    limpiar: () => set({ planes: [], resumen: null, cuentas: [], historial: {}, planesCargados: false, error: null }),
  };
});
