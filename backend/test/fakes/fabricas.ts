import type { PlanAhorro } from '../../src/domain/plan/plan-ahorro.js';
import { componerTasas } from '../../src/domain/tarifas.js';

export function planDePrueba(cambios: Partial<PlanAhorro> = {}): PlanAhorro {
  return {
    id: 'p1',
    clienteId: 'c1',
    nombre: 'Plan',
    icono: 'savings',
    estado: 'ACTIVO',
    moneda: 'USD',
    montoMetaCentavos: 100_000,
    fechaObjetivo: '2027-10-01',
    cuotaMensualCentavos: 8_000,
    plazoMeses: 12,
    prorrogasMeses: 0,
    diaDebito: 15,
    cuentaDebito: { id: 'cta', numeroEnmascarado: '******1234', tipo: 'AHORROS', moneda: 'USD' },
    bloqueado: false,
    bloqueadoDesde: null,
    tasas: componerTasas(4.5, 0),
    saldoCentavos: 0,
    reservadoCentavos: 0,
    interesesDevengadosCentavos: 0,
    fechaInicio: '2026-10-01',
    fechaFinEstimada: '2027-09-15',
    version: 1,
    creadoEn: '2026-10-01T00:00:00.000Z',
    actualizadoEn: '2026-10-01T00:00:00.000Z',
    ...cambios,
  };
}
