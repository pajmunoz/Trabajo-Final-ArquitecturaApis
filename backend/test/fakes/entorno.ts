import type { CoreBancarioPort } from '../../src/application/ports/core-bancario.port.js';
import { ClientesService } from '../../src/application/services/clientes.service.js';
import type { Actor } from '../../src/application/services/comunes.js';
import { ConsultasService } from '../../src/application/services/consultas.service.js';
import { CorteDebitosService } from '../../src/application/services/corte-debitos.service.js';
import { EjecutorCoreService } from '../../src/application/services/ejecutor-core.service.js';
import { MovimientosDineroService } from '../../src/application/services/movimientos-dinero.service.js';
import { PlanesService, type CrearPlanInput } from '../../src/application/services/planes.service.js';
import { ResultadosCoreService } from '../../src/application/services/resultados-core.service.js';
import type { CreditoSolicitado, DebitoSolicitado, ResultadoCore } from '../../src/domain/eventos.js';
import { CoreSimuladoAdapter } from '../../src/infrastructure/core/core-simulado.adapter.js';
import { IdsSecuenciales, loggerSilencioso, RelojFijo, UnitOfWorkEnMemoria } from './memoria.js';

export const CLIENTE: Actor = { usuarioId: '11111111-1111-4111-8111-111111111111', roles: ['CLIENTE'] };
export const OTRO_CLIENTE: Actor = { usuarioId: '22222222-2222-4222-8222-222222222222', roles: ['CLIENTE'] };
export const OPERADOR: Actor = { usuarioId: '33333333-3333-4333-8333-333333333333', roles: ['OPERADOR'] };
export const CUENTA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const CUENTA_POBRE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export const PLAN_BASE: CrearPlanInput = {
  nombre: 'Moto',
  icono: 'directions_car',
  montoMetaCentavos: 120_000,
  fechaObjetivo: '2027-10-01',
  diaDebito: 15,
  cuentaDebitoId: CUENTA,
  bloqueado: false,
};

/** Arma todos los servicios sobre repositorios en memoria y el Core simulado en memoria. */
export function crearEntorno(core?: CoreBancarioPort) {
  const uow = new UnitOfWorkEnMemoria();
  const reloj = new RelojFijo();
  const ids = new IdsSecuenciales();
  const coreSimulado = new CoreSimuladoAdapter([
    { id: CUENTA, clienteCoreId: '1712345678', alias: 'principal', numeroEnmascarado: '******8901', tipo: 'AHORROS', moneda: 'USD', saldoDisponibleCentavos: 1_000_000 },
    { id: CUENTA_POBRE, clienteCoreId: '1712345678', numeroEnmascarado: '******5432', tipo: 'CORRIENTE', moneda: 'USD', saldoDisponibleCentavos: 100 },
  ]);
  const puerto = core ?? coreSimulado;
  uow.base.usuarios.push(
    { id: CLIENTE.usuarioId, nombre: 'Pablo Jara', email: 'pablo@test.com', hashContrasena: 'x', roles: ['CLIENTE'], coreClienteId: '1712345678' },
    { id: OTRO_CLIENTE.usuarioId, nombre: 'Otro', email: 'otro@test.com', hashContrasena: 'x', roles: ['CLIENTE'], coreClienteId: null },
    { id: OPERADOR.usuarioId, nombre: 'Operador', email: 'op@test.com', hashContrasena: 'x', roles: ['OPERADOR'], coreClienteId: null },
  );
  const clientes = new ClientesService(uow, puerto);
  const ejecutor = new EjecutorCoreService(puerto, ids, reloj, loggerSilencioso);
  const resultados = new ResultadosCoreService(uow, reloj, ids, loggerSilencioso);

  return {
    uow,
    base: uow.base,
    reloj,
    ids,
    coreSimulado,
    clientes,
    planes: new PlanesService(uow, clientes, reloj, ids),
    dinero: new MovimientosDineroService(uow, clientes, reloj, ids),
    consultas: new ConsultasService(uow),
    corte: new CorteDebitosService(uow, reloj, ids, loggerSilencioso),
    resultados,
    ejecutor,
    /** Simula el viaje por RabbitMQ: toma las solicitudes pendientes de la outbox, las ejecuta y procesa el resultado. */
    async procesarOutbox(): Promise<ResultadoCore[]> {
      const solicitudes = uow.base.outbox.filter((e) => e.tipo === 'DebitoSolicitado' || e.tipo === 'CreditoSolicitado');
      uow.base.outbox = uow.base.outbox.filter((e) => !solicitudes.includes(e));
      const salida: ResultadoCore[] = [];
      for (const s of solicitudes) {
        const resultado = await ejecutor.ejecutar(s as DebitoSolicitado | CreditoSolicitado);
        await resultados.procesar(resultado);
        salida.push(resultado);
      }
      return salida;
    },
  };
}
