// Store local que imita a la API mientras el front no está conectado. Cada acción
// corresponde a una operación de contracts/openapi.yaml y aplica sus mismas reglas
// de negocio y códigos de error, para que el cambio a llamadas HTTP sea directo.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  calcularProgreso,
  calcularTasas,
  hoyISO,
  proximoDebito,
  simular,
  tasaEfectiva,
  tasasSinBloqueo,
} from "./finance";
import { cuentasIniciales, movimientosIniciales, planesIniciales } from "./mock-data";
import type {
  CrearPlanAhorro,
  CuentaDebito,
  Movimiento,
  PlanAhorro,
  ResumenPlanes,
  TipoMovimiento,
} from "./types";
import { cuentaEtiqueta } from "./format";

export type Resultado<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { valor: T }))
  | { ok: false; codigo: string; mensaje: string };

function error(codigo: string, mensaje: string) {
  return { ok: false as const, codigo, mensaje };
}

function nuevoId() {
  return crypto.randomUUID();
}

function ahora() {
  return new Date().toISOString();
}

function sinSaldo(cuenta: CuentaDebito): CuentaDebito {
  const copia = { ...cuenta };
  delete copia.saldoDisponibleCentavos;
  return copia;
}

/** Asienta un movimiento en el ledger del plan y recalcula los campos derivados. */
function asentar(
  plan: PlanAhorro,
  movimientos: Movimiento[],
  tipo: TipoMovimiento,
  montoCentavos: number,
  descripcion: string,
  origen: string
) {
  const saldoCentavos = plan.saldoCentavos + montoCentavos;
  const movimiento: Movimiento = {
    id: nuevoId(),
    tipo,
    montoCentavos,
    moneda: plan.moneda,
    saldoResultanteCentavos: saldoCentavos,
    fecha: ahora(),
    descripcion,
    origen,
  };
  const actualizado: PlanAhorro = {
    ...plan,
    saldoCentavos,
    saldoDisponibleCentavos: saldoCentavos,
    progreso: calcularProgreso(saldoCentavos, plan.montoMetaCentavos),
    actualizadoEn: movimiento.fecha,
  };
  return { plan: actualizado, movimientos: [movimiento, ...movimientos] };
}

interface GoalletStore {
  planes: PlanAhorro[];
  movimientos: Record<string, Movimiento[]>;
  cuentas: CuentaDebito[];

  resumen: () => ResumenPlanes;
  crearPlan: (input: CrearPlanAhorro) => Resultado<string>;
  aportar: (planId: string, montoCentavos: number, cuentaOrigenId: string) => Resultado;
  retirar: (planId: string, montoCentavos: number, cuentaDestinoId: string) => Resultado;
  bloquear: (planId: string) => Resultado;
  desbloquear: (planId: string) => Resultado<number>;
  cancelar: (planId: string, cuentaDestinoId?: string) => Resultado<number>;
}

export const useGoalletStore = create<GoalletStore>()(
  persist(
    (set, get) => {
      function buscarPlan(planId: string) {
        return get().planes.find((p) => p.id === planId);
      }

      function buscarCuenta(cuentaId: string) {
        return get().cuentas.find((c) => c.id === cuentaId);
      }

      function guardar(plan: PlanAhorro, movimientos: Movimiento[], cuentas = get().cuentas) {
        set((state) => ({
          planes: state.planes.map((p) => (p.id === plan.id ? plan : p)),
          movimientos: { ...state.movimientos, [plan.id]: movimientos },
          cuentas,
        }));
      }

      function moverSaldoCuenta(cuentaId: string, deltaCentavos: number) {
        return get().cuentas.map((c) =>
          c.id === cuentaId
            ? { ...c, saldoDisponibleCentavos: (c.saldoDisponibleCentavos ?? 0) + deltaCentavos }
            : c
        );
      }

      /** Si el plan estaba bloqueado, descuenta los intereses devengados (RF-01.7, RF-04.2). */
      function aplicarSalidaBloqueo(plan: PlanAhorro, movimientos: Movimiento[], motivo: string) {
        const perdidos = plan.bloqueado ? plan.interesesDevengadosCentavos : 0;
        let resultado = { plan, movimientos };
        if (perdidos > 0) {
          resultado = asentar(plan, movimientos, "PENALIDAD", -perdidos, motivo, "Intereses devengados");
        }
        return {
          plan: {
            ...resultado.plan,
            bloqueado: false,
            bloqueadoDesde: null,
            tasas: tasasSinBloqueo(plan.tasas),
            interesesDevengadosCentavos: plan.bloqueado ? 0 : plan.interesesDevengadosCentavos,
          },
          movimientos: resultado.movimientos,
          perdidos,
        };
      }

      return {
        planes: planesIniciales,
        movimientos: movimientosIniciales,
        cuentas: cuentasIniciales,

        // GET /v1/planes-ahorro → resumen
        resumen: () => {
          const planes = get().planes.filter((p) => p.estado !== "CANCELADO");
          return {
            moneda: "USD",
            totalAhorradoCentavos: planes.reduce((acc, p) => acc + p.saldoCentavos, 0),
            totalMetaCentavos: planes.reduce((acc, p) => acc + p.montoMetaCentavos, 0),
            cantidadPlanes: planes.length,
            planesActivos: planes.filter((p) => p.estado === "ACTIVO").length,
          };
        },

        // POST /v1/planes-ahorro
        crearPlan: (input) => {
          const cuenta = buscarCuenta(input.cuentaDebitoId);
          if (!cuenta) return error("VALIDACION", "Elige una cuenta de débito válida.");
          if (input.diaDebito < 1 || input.diaDebito > 28) {
            return error("VALIDACION", "El día de débito debe estar entre 1 y 28.");
          }
          const simulacion = simular(input.montoMetaCentavos, input.fechaObjetivo, input.bloqueado);
          if (!simulacion) {
            return error("VALIDACION", "La fecha objetivo debe estar entre 1 y 120 meses desde hoy.");
          }

          const hoy = hoyISO();
          const plan: PlanAhorro = {
            id: nuevoId(),
            nombre: input.nombre,
            objetivo: input.objetivo,
            icono: input.icono,
            estado: "ACTIVO",
            moneda: "USD",
            montoMetaCentavos: input.montoMetaCentavos,
            fechaObjetivo: input.fechaObjetivo,
            cuotaMensualCentavos: simulacion.cuotaMensualCentavos,
            plazoMeses: simulacion.plazoMeses,
            prorrogasMeses: 0,
            diaDebito: input.diaDebito,
            cuentaDebito: sinSaldo(cuenta),
            bloqueado: input.bloqueado,
            bloqueadoDesde: input.bloqueado ? ahora() : null,
            tasas: simulacion.tasas,
            saldoCentavos: 0,
            saldoDisponibleCentavos: 0,
            interesesDevengadosCentavos: 0,
            progreso: 0,
            proximoDebito: proximoDebito(input.diaDebito),
            fechaInicio: hoy,
            fechaFinEstimada: input.fechaObjetivo,
            creadoEn: ahora(),
            actualizadoEn: ahora(),
          };
          set((state) => ({
            planes: [plan, ...state.planes],
            movimientos: { ...state.movimientos, [plan.id]: [] },
          }));
          return { ok: true, valor: plan.id };
        },

        // POST /v1/planes-ahorro/{planId}/aportes
        aportar: (planId, montoCentavos, cuentaOrigenId) => {
          const plan = buscarPlan(planId);
          if (!plan) return error("NO_ENCONTRADO", "No encontramos ese Goallet.");
          if (plan.estado !== "ACTIVO") {
            return error("ESTADO_INVALIDO", "Solo se puede aportar a un Goallet activo.");
          }
          if (montoCentavos < 1) return error("VALIDACION", "Ingresa un monto válido.");
          const cuenta = buscarCuenta(cuentaOrigenId);
          if (!cuenta) return error("VALIDACION", "Elige una cuenta de origen válida.");
          if ((cuenta.saldoDisponibleCentavos ?? 0) < montoCentavos) {
            // En la API esto llega como Aporte FALLIDO con motivoFallo FONDOS_INSUFICIENTES.
            return error("FONDOS_INSUFICIENTES", "La cuenta de origen no tiene saldo suficiente.");
          }

          const r = asentar(
            plan,
            get().movimientos[planId] ?? [],
            "APORTE_MANUAL",
            montoCentavos,
            "Aporte voluntario",
            cuentaEtiqueta(cuenta)
          );
          const estado = r.plan.saldoCentavos >= plan.montoMetaCentavos ? "COMPLETADO" : "ACTIVO";
          guardar({ ...r.plan, estado }, r.movimientos, moverSaldoCuenta(cuentaOrigenId, -montoCentavos));
          return { ok: true };
        },

        // POST /v1/planes-ahorro/{planId}/retiros
        retirar: (planId, montoCentavos, cuentaDestinoId) => {
          const plan = buscarPlan(planId);
          if (!plan) return error("NO_ENCONTRADO", "No encontramos ese Goallet.");
          if (plan.estado !== "ACTIVO") {
            return error("ESTADO_INVALIDO", "Solo se puede retirar de un Goallet activo.");
          }
          if (plan.bloqueado) {
            return error(
              "RETIRO_NO_PERMITIDO",
              "Este Goallet tiene los fondos bloqueados. Desbloquéalo antes de retirar."
            );
          }
          if (montoCentavos < 1) return error("VALIDACION", "Ingresa un monto válido.");
          if (montoCentavos > plan.saldoDisponibleCentavos) {
            return error("SALDO_INSUFICIENTE", "El monto supera el saldo disponible del Goallet.");
          }
          const cuenta = buscarCuenta(cuentaDestinoId);
          if (!cuenta) return error("VALIDACION", "Elige una cuenta de destino válida.");

          const r = asentar(
            plan,
            get().movimientos[planId] ?? [],
            "RETIRO",
            -montoCentavos,
            "Retiro de fondos",
            cuentaEtiqueta(cuenta)
          );
          guardar(r.plan, r.movimientos, moverSaldoCuenta(cuentaDestinoId, montoCentavos));
          return { ok: true };
        },

        // POST /v1/planes-ahorro/{planId}/bloqueo
        bloquear: (planId) => {
          const plan = buscarPlan(planId);
          if (!plan) return error("NO_ENCONTRADO", "No encontramos ese Goallet.");
          if (plan.estado !== "ACTIVO") {
            return error("ESTADO_INVALIDO", "Solo se puede bloquear un Goallet activo.");
          }
          if (plan.bloqueado) return error("PLAN_YA_BLOQUEADO", "El Goallet ya está bloqueado.");

          const conBono = calcularTasas(plan.plazoMeses, true);
          const total = Math.round((plan.tasas.baseAnual + conBono.bonoBloqueoAnual) * 100) / 100;
          guardar(
            {
              ...plan,
              bloqueado: true,
              bloqueadoDesde: ahora(),
              tasas: {
                baseAnual: plan.tasas.baseAnual,
                bonoBloqueoAnual: conBono.bonoBloqueoAnual,
                totalAnual: total,
                efectivaAnual: tasaEfectiva(total),
              },
              actualizadoEn: ahora(),
            },
            get().movimientos[planId] ?? []
          );
          return { ok: true };
        },

        // POST /v1/planes-ahorro/{planId}/desbloqueo
        desbloquear: (planId) => {
          const plan = buscarPlan(planId);
          if (!plan) return error("NO_ENCONTRADO", "No encontramos ese Goallet.");
          if (plan.estado !== "ACTIVO") {
            return error("ESTADO_INVALIDO", "Solo se puede desbloquear un Goallet activo.");
          }
          if (!plan.bloqueado) return error("PLAN_NO_BLOQUEADO", "El Goallet no está bloqueado.");

          const r = aplicarSalidaBloqueo(
            plan,
            get().movimientos[planId] ?? [],
            "Intereses perdidos por desbloqueo"
          );
          guardar(r.plan, r.movimientos);
          return { ok: true, valor: r.perdidos };
        },

        // POST /v1/planes-ahorro/{planId}/cancelacion
        cancelar: (planId, cuentaDestinoId) => {
          const plan = buscarPlan(planId);
          if (!plan) return error("NO_ENCONTRADO", "No encontramos ese Goallet.");
          if (plan.estado !== "ACTIVO") {
            return error("ESTADO_INVALIDO", "Solo se puede cancelar un Goallet activo.");
          }
          const cuenta = buscarCuenta(cuentaDestinoId ?? plan.cuentaDebito.id);
          if (!cuenta) return error("VALIDACION", "Elige una cuenta de destino válida.");

          const salida = aplicarSalidaBloqueo(
            plan,
            get().movimientos[planId] ?? [],
            "Intereses perdidos por cancelación"
          );
          const devuelto = salida.plan.saldoCentavos;
          let r: { plan: PlanAhorro; movimientos: Movimiento[] } = {
            plan: salida.plan,
            movimientos: salida.movimientos,
          };
          if (devuelto > 0) {
            r = asentar(
              salida.plan,
              salida.movimientos,
              "DEVOLUCION",
              -devuelto,
              "Devolución por cancelación",
              cuentaEtiqueta(cuenta)
            );
          }
          guardar(
            { ...r.plan, estado: "CANCELADO", proximoDebito: null },
            r.movimientos,
            moverSaldoCuenta(cuenta.id, devuelto)
          );
          return { ok: true, valor: devuelto };
        },
      };
    },
    // Clave nueva: los datos guardados con la forma anterior (montos en dólares) no son compatibles.
    { name: "goallet-storage-v2", skipHydration: true }
  )
);
