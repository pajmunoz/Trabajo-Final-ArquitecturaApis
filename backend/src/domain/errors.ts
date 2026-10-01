/**
 * Error de negocio con un código estable. La capa de presentación lo traduce al
 * status HTTP y al formato application/problem+json del contrato.
 */
export type CodigoError =
  | 'VALIDACION'
  | 'CREDENCIALES_INVALIDAS'
  | 'TOKEN_INVALIDO'
  | 'PERMISO_INSUFICIENTE'
  | 'NO_ENCONTRADO'
  | 'ESTADO_INVALIDO'
  | 'PLAN_YA_BLOQUEADO'
  | 'PLAN_NO_BLOQUEADO'
  | 'RETIRO_NO_PERMITIDO'
  | 'SALDO_INSUFICIENTE'
  | 'IDEMPOTENCIA_CONFLICTO'
  | 'VERSION_DESACTUALIZADA'
  | 'CORE_NO_DISPONIBLE'
  | 'LIMITE_EXCEDIDO'
  | 'ERROR_INTERNO';

export class DomainError extends Error {
  constructor(
    public readonly codigo: CodigoError,
    message: string,
    public readonly errores?: { campo: string; mensaje: string }[],
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export const noEncontrado = (recurso: string, id: string) =>
  new DomainError('NO_ENCONTRADO', `No existe ${recurso} ${id}.`);
