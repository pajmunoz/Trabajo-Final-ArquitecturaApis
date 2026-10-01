import { DomainError, noEncontrado } from '../../domain/errors.js';
import type { CuentaDebito } from '../../domain/plan/plan-ahorro.js';
import { CoreNoDisponibleError, type CoreBancarioPort } from '../ports/core-bancario.port.js';
import type { UnitOfWork, Usuario } from '../ports/repositorios.js';

export interface Cliente {
  id: string;
  nombre: string;
  email: string;
}

export function traducirErrorCore(error: unknown): never {
  if (error instanceof CoreNoDisponibleError) {
    throw new DomainError('CORE_NO_DISPONIBLE', 'No fue posible consultar el Core bancario. Intente de nuevo en unos segundos.');
  }
  throw error;
}

/** Perfil del cliente y sus cuentas en el Core (vía Adaptador Core, camino síncrono). */
export class ClientesService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly core: CoreBancarioPort,
  ) {}

  async perfil(usuarioId: string): Promise<Cliente> {
    const usuario = await this.usuario(usuarioId);
    return { id: usuario.id, nombre: usuario.nombre, email: usuario.email };
  }

  async cuentas(usuarioId: string): Promise<CuentaDebito[]> {
    const usuario = await this.usuario(usuarioId);
    if (!usuario.coreClienteId) return [];
    return this.core.listarCuentas(usuario.coreClienteId).catch(traducirErrorCore);
  }

  /** Valida con el Core que la cuenta pertenezca al cliente. */
  async cuentaDelCliente(usuarioId: string, cuentaId: string): Promise<CuentaDebito> {
    const usuario = await this.usuario(usuarioId);
    const cuenta = usuario.coreClienteId
      ? await this.core.obtenerCuenta(usuario.coreClienteId, cuentaId).catch(traducirErrorCore)
      : null;
    if (!cuenta) {
      throw new DomainError('VALIDACION', 'La cuenta no existe o no pertenece al cliente.', [
        { campo: 'cuentaId', mensaje: 'cuenta inválida' },
      ]);
    }
    const { saldoDisponibleCentavos: _saldo, ...sinSaldo } = cuenta;
    return sinSaldo;
  }

  private async usuario(usuarioId: string): Promise<Usuario> {
    const usuario = await this.uow.repos.usuarios.buscarPorId(usuarioId);
    if (!usuario) throw noEncontrado('el cliente', usuarioId);
    return usuario;
  }
}
