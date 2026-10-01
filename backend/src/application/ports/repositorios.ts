import type { Cuota, EstadoCuota } from '../../domain/cuota/cuota.js';
import type { Evento } from '../../domain/eventos.js';
import type { Movimiento, OperacionCore, TipoMovimiento, TipoOperacion } from '../../domain/operaciones.js';
import type { EstadoPlan, PlanAhorro } from '../../domain/plan/plan-ahorro.js';
import type { PosicionCursor } from '../../shared/paginacion.js';

export type Rol = 'CLIENTE' | 'OPERADOR' | 'AUDITOR';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  hashContrasena: string;
  roles: Rol[];
  /** Identificador del cliente en el Core bancario (solo rol CLIENTE). */
  coreClienteId: string | null;
}

export interface UsuariosRepository {
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
}

export interface RefreshToken {
  hash: string;
  usuarioId: string;
  expiraEn: string;
  revocadoEn: string | null;
}

export interface RefreshTokensRepository {
  guardar(token: Omit<RefreshToken, 'revocadoEn'>): Promise<void>;
  buscar(hash: string): Promise<RefreshToken | null>;
  revocar(hash: string, cuando: string): Promise<boolean>;
}

export type OrdenPlanes = 'creadoEn' | '-creadoEn' | 'progreso' | '-progreso' | 'montoMetaCentavos' | '-montoMetaCentavos';

export interface FiltroPlanes {
  clienteId?: string;
  estados?: EstadoPlan[];
  bloqueado?: boolean;
}

export interface ResumenPlanes {
  moneda: 'USD';
  totalAhorradoCentavos: number;
  totalMetaCentavos: number;
  cantidadPlanes: number;
  planesActivos: number;
}

export interface PlanesRepository {
  crear(plan: PlanAhorro): Promise<void>;
  /** Con `paraActualizar` toma un bloqueo de fila hasta el fin de la transacción. */
  obtener(id: string, opciones?: { paraActualizar?: boolean }): Promise<PlanAhorro | null>;
  /** Guarda los cambios e incrementa `version`. */
  actualizar(plan: PlanAhorro): Promise<PlanAhorro>;
  listar(
    filtro: FiltroPlanes,
    orden: OrdenPlanes,
    pagina: number,
    limite: number,
  ): Promise<{ items: PlanAhorro[]; total: number }>;
  resumen(filtro: FiltroPlanes): Promise<ResumenPlanes>;
}

export interface CuotasRepository {
  crearVarias(cuotas: Cuota[]): Promise<void>;
  obtener(id: string, opciones?: { paraActualizar?: boolean }): Promise<Cuota | null>;
  actualizar(cuota: Cuota): Promise<void>;
  listarPorPlan(planId: string, estados: EstadoCuota[] | undefined, pagina: number, limite: number): Promise<{ items: Cuota[]; total: number }>;
  ultimaDelPlan(planId: string): Promise<Cuota | null>;
  /** Cancela las cuotas que todavía no entraron en cobro (al completar o cancelar el plan). */
  cancelarProgramadas(planId: string): Promise<number>;
  /** Invoca sp_procesar_debitos_ahorro_programado(): solo selecciona las cuotas a cobrar. */
  seleccionarDebitosDelDia(fecha: string, ahora: string): Promise<Cuota[]>;
}

export interface OperacionesRepository {
  crear(operacion: OperacionCore): Promise<void>;
  obtener(id: string, opciones?: { paraActualizar?: boolean }): Promise<OperacionCore | null>;
  obtenerDelPlan(planId: string, id: string, tipos: TipoOperacion[]): Promise<OperacionCore | null>;
  actualizar(operacion: OperacionCore): Promise<void>;
}

export interface FiltroMovimientos {
  tipos?: TipoMovimiento[];
  desde?: string;
  hasta?: string;
  despuesDe?: PosicionCursor;
  limite: number;
}

export interface MovimientosRepository {
  /** Inserta el asiento calculando el saldo resultante desde el ledger. */
  asentar(movimiento: Omit<Movimiento, 'saldoResultanteCentavos'>): Promise<Movimiento>;
  listar(planId: string, filtro: FiltroMovimientos): Promise<Movimiento[]>;
}

export interface OutboxRepository {
  agregar(evento: Evento): Promise<void>;
}

export interface CorridaCobro {
  id: string;
  fechaCorte: string;
  estado: 'EN_PROCESO' | 'COMPLETADA' | 'FALLIDA';
  iniciadaEn: string;
  finalizadaEn: string | null;
  totalCuotas: number;
  ejecutadas: number;
  rechazadas: number;
  reprogramadas: number;
  canceladas: number;
  erroresTecnicos: number;
}

export type ContadorCorrida = 'ejecutadas' | 'rechazadas' | 'reprogramadas' | 'canceladas' | 'erroresTecnicos';

export interface CorridasRepository {
  crear(corrida: CorridaCobro): Promise<void>;
  obtener(id: string): Promise<CorridaCobro | null>;
  actualizar(corrida: CorridaCobro): Promise<void>;
  incrementar(id: string, contador: ContadorCorrida): Promise<void>;
  listar(
    filtro: { desde?: string; hasta?: string; estado?: CorridaCobro['estado'] },
    pagina: number,
    limite: number,
  ): Promise<{ items: CorridaCobro[]; total: number }>;
}

export interface EventosProcesadosRepository {
  /** Devuelve false si el consumidor ya procesó ese evento (duplicado). */
  registrarSiNuevo(eventoId: string, consumidor: string): Promise<boolean>;
}

export interface RespuestaGuardada {
  clave: string;
  usuarioId: string;
  operacion: string;
  hashCuerpo: string;
  status: number;
  cuerpo: unknown;
  headers: Record<string, string>;
}

export interface IdempotenciaRepository {
  buscar(clave: string, usuarioId: string, operacion: string): Promise<RespuestaGuardada | null>;
  guardar(respuesta: RespuestaGuardada): Promise<void>;
}

export interface Repositorios {
  usuarios: UsuariosRepository;
  refreshTokens: RefreshTokensRepository;
  planes: PlanesRepository;
  cuotas: CuotasRepository;
  operaciones: OperacionesRepository;
  movimientos: MovimientosRepository;
  outbox: OutboxRepository;
  corridas: CorridasRepository;
  eventosProcesados: EventosProcesadosRepository;
  idempotencia: IdempotenciaRepository;
}

/** Unidad de trabajo: todo lo que se hace dentro de `ejecutar` es una sola transacción ACID. */
export interface UnitOfWork {
  ejecutar<T>(trabajo: (repos: Repositorios) => Promise<T>): Promise<T>;
  /** Acceso fuera de transacción, para lecturas. */
  readonly repos: Repositorios;
}
