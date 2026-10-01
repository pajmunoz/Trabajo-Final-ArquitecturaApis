import { DomainError } from '../domain/errors.js';

export interface PaginaOffset<T> {
  items: T[];
  pagina: number;
  limite: number;
  totalElementos: number;
  totalPaginas: number;
}

export interface PaginaCursor<T> {
  items: T[];
  siguienteCursor: string | null;
  hayMas: boolean;
}

export function paginaOffset<T>(items: T[], pagina: number, limite: number, total: number): PaginaOffset<T> {
  return { items, pagina, limite, totalElementos: total, totalPaginas: Math.ceil(total / limite) };
}

/** Posición de un elemento en un orden (fecha DESC, id DESC). */
export interface PosicionCursor {
  fecha: string;
  id: string;
}

// El cursor es opaco para el consumidor: base64url de la última posición entregada.
export function codificarCursor(posicion: PosicionCursor): string {
  return Buffer.from(JSON.stringify(posicion)).toString('base64url');
}

export function decodificarCursor(cursor: string): PosicionCursor {
  try {
    const valor = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<PosicionCursor>;
    if (typeof valor.fecha !== 'string' || typeof valor.id !== 'string') throw new Error('forma');
    return { fecha: valor.fecha, id: valor.id };
  } catch {
    throw new DomainError('VALIDACION', 'El cursor no es válido.', [{ campo: 'cursor', mensaje: 'cursor inválido' }]);
  }
}
