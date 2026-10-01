import amqp from 'amqplib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Evento } from '../../src/domain/eventos.js';
import { COLAS, RabbitMq } from '../../src/infrastructure/messaging/rabbitmq.js';
import { loggerSilencioso } from '../fakes/memoria.js';

const URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Usa una vhost propia para no interferir con los procesos de docker compose
 * (que consumen las mismas colas en la vhost por defecto).
 */
const VHOST = 'pruebas';
let broker: RabbitMq;

async function crearVhost() {
  const respuesta = await fetch(`http://localhost:15672/api/vhosts/${VHOST}`, {
    method: 'PUT',
    headers: { authorization: `Basic ${Buffer.from('guest:guest').toString('base64')}` },
  });
  if (respuesta.status >= 300) throw new Error(`No se pudo crear la vhost: ${respuesta.status}`);
  await fetch(`http://localhost:15672/api/permissions/${VHOST}/guest`, {
    method: 'PUT',
    headers: { authorization: `Basic ${Buffer.from('guest:guest').toString('base64')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ configure: '.*', write: '.*', read: '.*' }),
  });
}

beforeAll(async () => {
  await crearVhost();
  broker = await RabbitMq.conectar(`${URL}/${VHOST}`, loggerSilencioso, 3);
});

afterAll(async () => {
  await broker?.cerrar();
});

const evento = (tipo: string): Evento => ({ id: crypto.randomUUID(), tipo, correlationId: crypto.randomUUID(), ocurridoEn: new Date().toISOString(), datos: { n: 1 } });

describe('RabbitMQ: publicación/suscripción por tipo de evento', () => {
  it('enruta cada evento a las colas suscritas y entrega al consumidor', async () => {
    const recibidos: Evento[] = [];
    await broker.consumir('solicitudesCore', async (e) => void recibidos.push(e));
    const enviado = evento('DebitoSolicitado');
    await broker.publicar(enviado);
    await broker.publicar(evento('PlanCreado'));
    await esperar(300);
    expect(recibidos.map((e) => e.id)).toEqual([enviado.id]);
  });

  it('un mensaje que falla dos veces termina en la DLQ (no se pierde)', async () => {
    let intentos = 0;
    await broker.consumir('resultadosCore', async () => {
      intentos++;
      throw new Error('falla');
    });
    const fallido = evento('DebitoFallido');
    await broker.publicar(fallido);
    await esperar(500);
    expect(intentos).toBe(2);

    const conexion = await amqp.connect(`${URL}/${VHOST}`);
    const canal = await conexion.createChannel();
    const mensaje = await canal.get(`${COLAS.resultadosCore.nombre}.dlq`, { noAck: true });
    expect(mensaje && JSON.parse(mensaje.content.toString()).id).toBe(fallido.id);
    await conexion.close();
  });

  it('falla al conectar si el broker no existe', async () => {
    await expect(RabbitMq.conectar('amqp://guest:guest@localhost:1', loggerSilencioso, 1)).rejects.toThrow();
  });
});
