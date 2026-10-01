import { z } from 'zod';
import { ICONOS, type Icono } from '../../../domain/plan/plan-ahorro.js';

// Esquemas Zod que reflejan contracts/openapi.yaml (fuente de verdad).

const centavos = z.number().int('debe ser un entero en centavos').min(1, 'debe ser mayor o igual a 1').max(Number.MAX_SAFE_INTEGER);
const fecha = z.iso.date('debe ser una fecha YYYY-MM-DD');
const uuid = z.uuid('debe ser un UUID');
const icono = z.enum(ICONOS as unknown as [Icono, ...Icono[]]);

/** Lista separada por comas en query (?estado=ACTIVO,COMPLETADO). */
const listaDe = <const T extends readonly [string, ...string[]]>(valores: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v),
    z.array(z.enum(valores)).optional(),
  );

const booleano = z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean());

export const paginaOffsetQuery = {
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(10),
};

// --- Autenticación -----------------------------------------------------------
export const solicitudTokenDto = z.discriminatedUnion('grantType', [
  z.object({ grantType: z.literal('password'), email: z.email().max(254), contrasena: z.string().min(8).max(128) }).strict(),
  z.object({ grantType: z.literal('refresh_token'), refreshToken: z.string().min(1) }).strict(),
]);

// --- Simulación --------------------------------------------------------------
export const simulacionQuery = z.object({
  montoMetaCentavos: z.coerce.number().int().min(1),
  fechaObjetivo: fecha,
  bloqueado: booleano.default(false),
});

// --- Planes ------------------------------------------------------------------
export const planIdParams = z.object({ planId: uuid });
export const aporteIdParams = z.object({ planId: uuid, aporteId: uuid });
export const retiroIdParams = z.object({ planId: uuid, retiroId: uuid });
export const corridaIdParams = z.object({ corridaId: uuid });

export const listarPlanesQuery = z.object({
  estado: listaDe(['ACTIVO', 'COMPLETADO', 'CANCELADO']),
  bloqueado: booleano.optional(),
  clienteId: uuid.optional(),
  orden: z
    .enum(['creadoEn', '-creadoEn', 'progreso', '-progreso', 'montoMetaCentavos', '-montoMetaCentavos'])
    .default('-creadoEn'),
  ...paginaOffsetQuery,
});

export const crearPlanDto = z
  .object({
    nombre: z.string().trim().min(1).max(60),
    objetivo: z.string().trim().max(140).optional(),
    icono,
    montoMetaCentavos: centavos,
    fechaObjetivo: fecha,
    diaDebito: z.number().int().min(1).max(28),
    cuentaDebitoId: uuid,
    bloqueado: z.boolean().default(false),
  })
  .strict();

export const modificarPlanDto = z
  .object({
    nombre: z.string().trim().min(1).max(60).optional(),
    objetivo: z.string().trim().max(140).optional(),
    icono: icono.optional(),
    diaDebito: z.number().int().min(1).max(28).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'debe enviar al menos un campo');

export const cancelacionDto = z
  .object({ motivo: z.string().max(200).optional(), cuentaDestinoId: uuid.optional() })
  .strict()
  .default({});

export const aporteDto = z.object({ montoCentavos: centavos, cuentaOrigenId: uuid.optional() }).strict();
export const retiroDto = z.object({ montoCentavos: centavos, cuentaDestinoId: uuid.optional() }).strict();

// --- Cuotas, movimientos y corridas ----------------------------------------
export const cuotasQuery = z.object({
  estado: listaDe(['PROGRAMADA', 'PENDIENTE', 'EJECUTADA', 'CANCELADA']),
  ...paginaOffsetQuery,
});

export const movimientosQuery = z.object({
  tipo: listaDe(['APORTE_AUTOMATICO', 'APORTE_MANUAL', 'INTERES', 'RETIRO', 'PENALIDAD', 'DEVOLUCION']),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  cursor: z.string().max(512).optional(),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

export const corridasQuery = z.object({
  desde: fecha.optional(),
  hasta: fecha.optional(),
  estado: z.enum(['EN_PROCESO', 'COMPLETADA', 'FALLIDA']).optional(),
  ...paginaOffsetQuery,
});

export type CrearPlanDto = z.infer<typeof crearPlanDto>;
export type ListarPlanesQuery = z.infer<typeof listarPlanesQuery>;
