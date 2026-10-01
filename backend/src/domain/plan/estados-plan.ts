import { DomainError } from '../errors.js';
import { saldoDisponible, type EstadoPlan, type PlanAhorro } from './plan-ahorro.js';

/**
 * Patrón State para el ciclo de vida del plan:
 *   ACTIVO → COMPLETADO (el saldo alcanza la meta)
 *   ACTIVO → CANCELADO  (a pedido del cliente)
 * Dentro de ACTIVO, el bloqueo es un sub-estado (bloqueado ↔ no bloqueado).
 * Cada operación inválida para el estado actual lanza un error que la API
 * traduce a 409 Conflict.
 */
export interface EstadoPlanState {
  readonly nombre: EstadoPlan;
  validarModificacion(plan: PlanAhorro): void;
  validarAporte(plan: PlanAhorro): void;
  validarRetiro(plan: PlanAhorro, montoCentavos: number): void;
  validarBloqueo(plan: PlanAhorro): void;
  validarDesbloqueo(plan: PlanAhorro): void;
  validarCancelacion(plan: PlanAhorro): void;
  /** true si el plan debe pasar a COMPLETADO con este saldo. */
  debeCompletarse(plan: PlanAhorro): boolean;
}

abstract class EstadoFinal implements EstadoPlanState {
  abstract readonly nombre: EstadoPlan;

  private rechazar(accion: string): never {
    throw new DomainError('ESTADO_INVALIDO', `No se puede ${accion} un plan en estado ${this.nombre}.`);
  }

  validarModificacion(): void {
    this.rechazar('modificar');
  }
  validarAporte(): void {
    this.rechazar('aportar a');
  }
  validarRetiro(): void {
    this.rechazar('retirar de');
  }
  validarBloqueo(): void {
    this.rechazar('bloquear');
  }
  validarDesbloqueo(): void {
    this.rechazar('desbloquear');
  }
  validarCancelacion(): void {
    this.rechazar('cancelar');
  }
  debeCompletarse(): boolean {
    return false;
  }
}

export class ActivoState implements EstadoPlanState {
  readonly nombre = 'ACTIVO' as const;

  validarModificacion(): void {}

  validarAporte(): void {}

  validarRetiro(plan: PlanAhorro, montoCentavos: number): void {
    if (plan.bloqueado) {
      throw new DomainError(
        'RETIRO_NO_PERMITIDO',
        'El plan tiene los fondos bloqueados. Desbloquéelo antes de retirar.',
      );
    }
    if (montoCentavos > saldoDisponible(plan)) {
      throw new DomainError('SALDO_INSUFICIENTE', 'El monto supera el saldo disponible del plan.');
    }
  }

  validarBloqueo(plan: PlanAhorro): void {
    if (plan.bloqueado) throw new DomainError('PLAN_YA_BLOQUEADO', 'El plan ya está bloqueado.');
  }

  validarDesbloqueo(plan: PlanAhorro): void {
    if (!plan.bloqueado) throw new DomainError('PLAN_NO_BLOQUEADO', 'El plan no está bloqueado.');
  }

  validarCancelacion(): void {}

  debeCompletarse(plan: PlanAhorro): boolean {
    return plan.saldoCentavos >= plan.montoMetaCentavos;
  }
}

export class CompletadoState extends EstadoFinal {
  readonly nombre = 'COMPLETADO' as const;
}

export class CanceladoState extends EstadoFinal {
  readonly nombre = 'CANCELADO' as const;
}

const estados: Record<EstadoPlan, EstadoPlanState> = {
  ACTIVO: new ActivoState(),
  COMPLETADO: new CompletadoState(),
  CANCELADO: new CanceladoState(),
};

export function estadoDe(plan: Pick<PlanAhorro, 'estado'>): EstadoPlanState {
  return estados[plan.estado];
}
