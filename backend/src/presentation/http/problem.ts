import { DomainError, type CodigoError } from '../../domain/errors.js';

/** Cuerpo application/problem+json (RFC 9457) con el `codigo` estable del contrato. */
export interface Problema {
  type: string;
  title: string;
  status: number;
  codigo: CodigoError;
  detail?: string;
  instance?: string;
  errores?: { campo: string; mensaje: string }[];
}

const TIPOS = 'https://api.billetera-ahorro.example.com/problemas';

const CATALOGO: Record<CodigoError, { status: number; title: string; slug: string }> = {
  VALIDACION: { status: 400, title: 'Datos inválidos', slug: 'validacion' },
  CREDENCIALES_INVALIDAS: { status: 401, title: 'Credenciales inválidas', slug: 'credenciales-invalidas' },
  TOKEN_INVALIDO: { status: 401, title: 'Token inválido', slug: 'token-invalido' },
  PERMISO_INSUFICIENTE: { status: 403, title: 'Permiso insuficiente', slug: 'permiso-insuficiente' },
  NO_ENCONTRADO: { status: 404, title: 'Recurso no encontrado', slug: 'no-encontrado' },
  ESTADO_INVALIDO: { status: 409, title: 'Operación no permitida en el estado actual', slug: 'estado-invalido' },
  PLAN_YA_BLOQUEADO: { status: 409, title: 'El plan ya está bloqueado', slug: 'plan-ya-bloqueado' },
  PLAN_NO_BLOQUEADO: { status: 409, title: 'El plan no está bloqueado', slug: 'plan-no-bloqueado' },
  RETIRO_NO_PERMITIDO: { status: 409, title: 'Retiro no permitido', slug: 'retiro-no-permitido' },
  SALDO_INSUFICIENTE: { status: 409, title: 'Saldo insuficiente', slug: 'saldo-insuficiente' },
  IDEMPOTENCIA_CONFLICTO: { status: 409, title: 'Idempotency-Key reutilizada', slug: 'idempotencia' },
  VERSION_DESACTUALIZADA: { status: 412, title: 'Versión desactualizada', slug: 'version-desactualizada' },
  LIMITE_EXCEDIDO: { status: 429, title: 'Demasiadas peticiones', slug: 'limite-excedido' },
  ERROR_INTERNO: { status: 500, title: 'Error interno', slug: 'error-interno' },
  CORE_NO_DISPONIBLE: { status: 503, title: 'Core bancario no disponible', slug: 'core-no-disponible' },
};

export function problemaDe(codigo: CodigoError, detail?: string, instance?: string, errores?: Problema['errores']): Problema {
  const entrada = CATALOGO[codigo];
  return {
    type: `${TIPOS}/${entrada.slug}`,
    title: entrada.title,
    status: entrada.status,
    codigo,
    ...(detail && { detail }),
    ...(instance && { instance }),
    ...(errores?.length && { errores }),
  };
}

export function problemaDeError(error: DomainError, instance?: string): Problema {
  return problemaDe(error.codigo, error.message, instance, error.errores);
}
