import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CoreNoDisponibleError,
  CoreRechazoError,
  type CoreBancarioPort,
} from '../../src/application/ports/core-bancario.port.js';
import { cargarConfig } from '../../src/config/env.js';
import { CoreLegacyAdapter } from '../../src/infrastructure/core/core-legacy.adapter.js';
import { CoreSimuladoAdapter } from '../../src/infrastructure/core/core-simulado.adapter.js';
import { CircuitBreakerCoreDecorator, CircuitoAbiertoError } from '../../src/infrastructure/core/decoradores/circuit-breaker.decorator.js';
import { LoggingCoreDecorator } from '../../src/infrastructure/core/decoradores/logging.decorator.js';
import { RetryCoreDecorator } from '../../src/infrastructure/core/decoradores/retry.decorator.js';
import { TimeoutCoreDecorator } from '../../src/infrastructure/core/decoradores/timeout.decorator.js';
import { construirPuertoCore } from '../../src/infrastructure/core/fabrica-core.js';
import { loggerSilencioso } from '../fakes/memoria.js';

const SOLICITUD = { operacionId: 'op-1', cuentaId: 'cta', montoCentavos: 1234 };

/** Puerto falso cuyo `debitar` responde con la secuencia de resultados indicada. */
function puertoQue(...resultados: Array<'ok' | Error>): CoreBancarioPort & { llamadas: number } {
  const puerto = {
    llamadas: 0,
    listarCuentas: async () => [],
    obtenerCuenta: async () => null,
    acreditar: async () => undefined,
    debitar: async () => {
      const r = resultados[Math.min(puerto.llamadas, resultados.length - 1)];
      puerto.llamadas++;
      if (r instanceof Error) throw r;
    },
  };
  return puerto;
}

describe('RetryCoreDecorator (backoff exponencial con jitter)', () => {
  it('espera base·2^n + jitter', () => {
    const retry = new RetryCoreDecorator(puertoQue('ok'), { intentos: 3, baseMs: 1000, aleatorio: () => 0.5 });
    expect([0, 1, 2].map((n) => retry.espera(n))).toEqual([1500, 2500, 4500]);
  });

  it('reintenta fallos técnicos hasta tener éxito', async () => {
    const interno = puertoQue(new CoreNoDisponibleError(), new CoreNoDisponibleError(), 'ok');
    const esperas: number[] = [];
    const retry = new RetryCoreDecorator(interno, { intentos: 3, baseMs: 10, aleatorio: () => 0, esperar: async (ms) => void esperas.push(ms) }, loggerSilencioso);
    await retry.debitar(SOLICITUD);
    expect(interno.llamadas).toBe(3);
    expect(esperas).toEqual([10, 20]);
  });

  it('se rinde al agotar los intentos', async () => {
    const interno = puertoQue(new CoreNoDisponibleError());
    const retry = new RetryCoreDecorator(interno, { intentos: 2, baseMs: 1, esperar: async () => undefined });
    await expect(retry.debitar(SOLICITUD)).rejects.toBeInstanceOf(CoreNoDisponibleError);
    expect(interno.llamadas).toBe(3);
  });

  it('no reintenta rechazos de negocio ni el circuito abierto', async () => {
    for (const error of [new CoreRechazoError('FONDOS_INSUFICIENTES'), new CircuitoAbiertoError()]) {
      const interno = puertoQue(error);
      const retry = new RetryCoreDecorator(interno, { intentos: 3, baseMs: 1, esperar: async () => undefined });
      await expect(retry.debitar(SOLICITUD)).rejects.toBe(error);
      expect(interno.llamadas).toBe(1);
    }
  });

  it('usa la espera real por defecto', async () => {
    const retry = new RetryCoreDecorator(puertoQue(new CoreNoDisponibleError(), 'ok'), { intentos: 1, baseMs: 1 });
    await expect(retry.debitar(SOLICITUD)).resolves.toBeUndefined();
  });
});

describe('TimeoutCoreDecorator', () => {
  it('corta una llamada lenta con CoreNoDisponibleError', async () => {
    const lento = { ...puertoQue('ok'), listarCuentas: () => new Promise<never>(() => undefined) };
    await expect(new TimeoutCoreDecorator(lento, 20).listarCuentas('c')).rejects.toThrow(/no respondió en 20 ms/);
  });

  it('deja pasar respuestas a tiempo', async () => {
    await expect(new TimeoutCoreDecorator(puertoQue('ok'), 100).obtenerCuenta('c', 'x')).resolves.toBeNull();
  });
});

describe('CircuitBreakerCoreDecorator', () => {
  it('se abre con fallos técnicos y responde de inmediato mientras está abierto', async () => {
    const interno = puertoQue(new CoreNoDisponibleError());
    const cb = new CircuitBreakerCoreDecorator(interno, { umbralErrorPorcentaje: 50, ventanaMs: 10_000, resetMs: 60_000, volumenMinimo: 2 }, loggerSilencioso);
    await expect(cb.debitar(SOLICITUD)).rejects.toBeInstanceOf(CoreNoDisponibleError);
    await expect(cb.debitar(SOLICITUD)).rejects.toBeInstanceOf(CoreNoDisponibleError);
    expect(cb.estado).toBe('ABIERTO');
    await expect(cb.debitar(SOLICITUD)).rejects.toBeInstanceOf(CircuitoAbiertoError);
    expect(interno.llamadas).toBe(2);
    cb.apagar();
  });

  it('los rechazos de negocio no abren el circuito', async () => {
    const cb = new CircuitBreakerCoreDecorator(puertoQue(new CoreRechazoError('FONDOS_INSUFICIENTES')), { umbralErrorPorcentaje: 50, ventanaMs: 10_000, resetMs: 60_000, volumenMinimo: 1 });
    for (let i = 0; i < 5; i++) await expect(cb.debitar(SOLICITUD)).rejects.toBeInstanceOf(CoreRechazoError);
    expect(cb.estado).toBe('CERRADO');
    cb.apagar();
  });

  it('pasa a semiabierto después del tiempo de reset', async () => {
    const cb = new CircuitBreakerCoreDecorator(puertoQue(new CoreNoDisponibleError(), 'ok'), { umbralErrorPorcentaje: 1, ventanaMs: 10_000, resetMs: 30, volumenMinimo: 1 });
    await expect(cb.debitar(SOLICITUD)).rejects.toThrow();
    expect(cb.estado).toBe('ABIERTO');
    await new Promise((r) => setTimeout(r, 60));
    expect(cb.estado).toBe('SEMIABIERTO');
    await cb.debitar(SOLICITUD);
    expect(cb.estado).toBe('CERRADO');
    cb.apagar();
  });
});

describe('LoggingCoreDecorator', () => {
  it('registra éxito, rechazo y error con su duración', async () => {
    const registros: Array<[string, Record<string, unknown>]> = [];
    const logger = {
      info: (o: Record<string, unknown>) => registros.push(['info', o]),
      warn: (o: Record<string, unknown>) => registros.push(['warn', o]),
    } as never;
    let t = 0;
    const reloj = () => (t += 5);
    await new LoggingCoreDecorator(puertoQue('ok'), logger, reloj).debitar(SOLICITUD);
    await expect(new LoggingCoreDecorator(puertoQue(new CoreRechazoError('CUENTA_BLOQUEADA')), logger, reloj).debitar(SOLICITUD)).rejects.toThrow();
    await expect(new LoggingCoreDecorator(puertoQue(new CoreNoDisponibleError()), logger, reloj).debitar(SOLICITUD)).rejects.toThrow();
    expect(registros.map(([nivel, o]) => [nivel, o.resultado, o.duracionMs])).toEqual([
      ['info', 'OK', 5],
      ['info', 'RECHAZO', 5],
      ['warn', 'ERROR', 5],
    ]);
  });

  it('delega todas las operaciones del puerto', async () => {
    const simulado = new CoreSimuladoAdapter([{ id: 'c1', clienteCoreId: 'x', numeroEnmascarado: '**1', tipo: 'AHORROS', moneda: 'USD', saldoDisponibleCentavos: 0 }]);
    const log = new LoggingCoreDecorator(simulado, loggerSilencioso);
    expect(await log.listarCuentas('x')).toHaveLength(1);
    await log.acreditar({ operacionId: 'a', cuentaId: 'c1', montoCentavos: 10 });
    expect(simulado.saldoDe('c1')).toBe(10);
  });
});

describe('CoreSimuladoAdapter', () => {
  it('debita, acredita, rechaza y es idempotente por operación', async () => {
    const core = new CoreSimuladoAdapter([
      { id: 'c1', clienteCoreId: 'x', numeroEnmascarado: '**1', tipo: 'AHORROS', moneda: 'USD', saldoDisponibleCentavos: 1000 },
      { id: 'c2', clienteCoreId: 'x', numeroEnmascarado: '**2', tipo: 'AHORROS', moneda: 'USD', saldoDisponibleCentavos: 0, bloqueada: true },
    ]);
    await core.debitar({ operacionId: 'o1', cuentaId: 'c1', montoCentavos: 400 });
    await core.debitar({ operacionId: 'o1', cuentaId: 'c1', montoCentavos: 400 });
    expect(core.saldoDe('c1')).toBe(600);
    await expect(core.debitar({ operacionId: 'o2', cuentaId: 'c1', montoCentavos: 700 })).rejects.toMatchObject({ motivo: 'FONDOS_INSUFICIENTES' });
    await expect(core.acreditar({ operacionId: 'o3', cuentaId: 'c2', montoCentavos: 1 })).rejects.toMatchObject({ motivo: 'CUENTA_BLOQUEADA' });
    expect(await core.obtenerCuenta('x', 'c1')).toMatchObject({ id: 'c1', saldoDisponibleCentavos: 600 });
    expect(await core.obtenerCuenta('otro', 'c1')).toBeNull();
  });
});

describe('CoreLegacyAdapter (HTTP)', () => {
  afterEach(() => vi.unstubAllGlobals());

  const responder = (status: number, cuerpo: unknown = {}) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })));

  it('traduce cuentas del Core (decimales) a centavos y enmascara el número', async () => {
    responder(200, [{ id: 'u1', alias: 'mi', numeroCuenta: '0070128901', tipoCuenta: 'AHORROS', moneda: 'USD', saldo: '4528.30' }]);
    const cuentas = await new CoreLegacyAdapter('http://core').listarCuentas('171');
    expect(cuentas).toEqual([{ id: 'u1', alias: 'mi', numeroEnmascarado: '******8901', tipo: 'AHORROS', moneda: 'USD', saldoDisponibleCentavos: 452830 }]);
  });

  it('404 → sin cuentas o cuenta inexistente', async () => {
    responder(404);
    const core = new CoreLegacyAdapter('http://core');
    expect(await core.listarCuentas('x')).toEqual([]);
    expect(await core.obtenerCuenta('x', 'y')).toBeNull();
  });

  it('obtiene una cuenta', async () => {
    responder(200, { id: 'u1', numeroCuenta: '1', tipoCuenta: 'CORRIENTE', moneda: 'USD', saldo: '1.00' });
    expect(await new CoreLegacyAdapter('http://core').obtenerCuenta('x', 'u1')).toMatchObject({ id: 'u1', tipo: 'CORRIENTE', saldoDisponibleCentavos: 100 });
  });

  it('envía el monto en decimales y traduce rechazos 422', async () => {
    const fetchFalso = vi.fn(async () => new Response(JSON.stringify({ codigo: 'CUENTA_BLOQUEADA' }), { status: 422 }));
    vi.stubGlobal('fetch', fetchFalso);
    const core = new CoreLegacyAdapter('http://core');
    await expect(core.acreditar(SOLICITUD)).rejects.toMatchObject({ motivo: 'CUENTA_BLOQUEADA' });
    expect(JSON.parse(String((fetchFalso.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({ referencia: 'op-1', cuentaId: 'cta', monto: '12.34' });
    responder(422, {});
    await expect(core.debitar(SOLICITUD)).rejects.toMatchObject({ motivo: 'FONDOS_INSUFICIENTES' });
    responder(201, {});
    await expect(core.debitar(SOLICITUD)).resolves.toBeUndefined();
  });

  it('5xx y errores de red son fallos técnicos', async () => {
    responder(503);
    await expect(new CoreLegacyAdapter('http://core').debitar(SOLICITUD)).rejects.toBeInstanceOf(CoreNoDisponibleError);
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    await expect(new CoreLegacyAdapter('http://core').listarCuentas('x')).rejects.toBeInstanceOf(CoreNoDisponibleError);
  });
});

describe('fabrica del puerto del Core', () => {
  it('el camino síncrono no reintenta y el asíncrono sí', async () => {
    const config = cargarConfig({ CORE_MODO: 'memoria', RETRY_BASE_MS: '1', RETRY_INTENTOS: '1' });
    const sincrono = construirPuertoCore(config, loggerSilencioso, 'sincrono');
    const asincrono = construirPuertoCore(config, loggerSilencioso, 'asincrono');
    expect(sincrono.puerto).toBeInstanceOf(CircuitBreakerCoreDecorator);
    expect(asincrono.puerto).toBeInstanceOf(RetryCoreDecorator);
    expect(await sincrono.puerto.listarCuentas('x')).toEqual([]);
    const http = construirPuertoCore(cargarConfig({}), loggerSilencioso, 'sincrono');
    for (const p of [sincrono, asincrono, http]) p.circuito.apagar();
  });

  it('valida la configuración', () => {
    expect(() => cargarConfig({ API_PORT: 'abc' })).toThrow(/Configuración inválida/);
    expect(cargarConfig().API_PORT).toBeGreaterThan(0);
  });
});
