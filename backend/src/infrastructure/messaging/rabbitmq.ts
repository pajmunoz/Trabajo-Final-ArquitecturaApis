import amqp, { type Channel, type ChannelModel, type ConfirmChannel, type ConsumeMessage } from 'amqplib';
import type { Evento } from '../../domain/eventos.js';
import type { Logger } from '../../shared/logger.js';

export const EXCHANGE = 'billetera.eventos';
/** Mensajes que fallaron dos veces: quedan en <cola>.dlq para revisión y reproceso. */
export const EXCHANGE_DLX = 'billetera.dlx';

/** Colas y los eventos que reciben (publicación/suscripción por tipo de evento). */
export const COLAS = {
  solicitudesCore: { nombre: 'core-adapter.solicitudes', eventos: ['DebitoSolicitado', 'CreditoSolicitado'] },
  resultadosCore: {
    nombre: 'batch.resultados',
    eventos: ['DebitoEjecutado', 'DebitoFallido', 'CreditoEjecutado', 'CreditoFallido'],
  },
  // El Sistema de Notificaciones (externo) se suscribe a esta cola.
  notificaciones: {
    nombre: 'notificaciones.eventos',
    eventos: ['PlanCreado', 'PlanCancelado', 'DebitoEjecutado', 'DebitoFallido', 'CreditoEjecutado', 'CreditoFallido'],
  },
} as const;

export type NombreCola = keyof typeof COLAS;

export class RabbitMq {
  private constructor(
    private readonly conexion: ChannelModel,
    private readonly confirmacion: ConfirmChannel,
    private readonly consumo: Channel,
    private readonly logger: Logger,
  ) {}

  static async conectar(url: string, logger: Logger, reintentos = 30): Promise<RabbitMq> {
    for (let intento = 1; ; intento++) {
      try {
        const conexion = await amqp.connect(url);
        const confirmacion = await conexion.createConfirmChannel();
        const consumo = await conexion.createChannel();
        await consumo.prefetch(10);
        const broker = new RabbitMq(conexion, confirmacion, consumo, logger);
        await broker.declararTopologia();
        logger.info('Conectado a RabbitMQ');
        return broker;
      } catch (error) {
        if (intento >= reintentos) throw error;
        logger.warn({ intento }, 'RabbitMQ no disponible, reintentando en 2 s');
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  private async declararTopologia(): Promise<void> {
    await this.consumo.assertExchange(EXCHANGE, 'topic', { durable: true });
    await this.consumo.assertExchange(EXCHANGE_DLX, 'direct', { durable: true });
    for (const cola of Object.values(COLAS)) {
      await this.consumo.assertQueue(`${cola.nombre}.dlq`, { durable: true });
      await this.consumo.bindQueue(`${cola.nombre}.dlq`, EXCHANGE_DLX, cola.nombre);
      await this.consumo.assertQueue(cola.nombre, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': EXCHANGE_DLX,
          'x-dead-letter-routing-key': cola.nombre,
          // La cola del sistema externo de notificaciones no crece sin límite si nadie la consume.
          ...(cola.nombre === COLAS.notificaciones.nombre && { 'x-message-ttl': 86_400_000 }),
        },
      });
      for (const evento of cola.eventos) await this.consumo.bindQueue(cola.nombre, EXCHANGE, evento);
    }
  }

  /** Publica con confirmación del broker: si no confirma, la promesa falla y el evento queda en la outbox. */
  async publicar(evento: Evento): Promise<void> {
    this.confirmacion.publish(EXCHANGE, evento.tipo, Buffer.from(JSON.stringify(evento)), {
      persistent: true,
      contentType: 'application/json',
      messageId: evento.id,
      correlationId: evento.correlationId,
      type: evento.tipo,
    });
    await this.confirmacion.waitForConfirms();
  }

  /**
   * Consume una cola. El mensaje se confirma (ack) solo si el manejador termina bien;
   * si falla, vuelve a la cola una vez y, si falla de nuevo, pasa a la DLQ (no se pierde).
   */
  async consumir(cola: NombreCola, manejador: (evento: Evento) => Promise<void>): Promise<void> {
    await this.consumo.consume(COLAS[cola].nombre, (mensaje: ConsumeMessage | null) => {
      if (!mensaje) return;
      void (async () => {
        try {
          const evento = JSON.parse(mensaje.content.toString()) as Evento;
          await manejador(evento);
          this.consumo.ack(mensaje);
        } catch (error) {
          const reintento = !mensaje.fields.redelivered;
          this.logger.error({ err: error, cola, reintento }, 'Error procesando mensaje');
          this.consumo.nack(mensaje, false, reintento);
        }
      })();
    });
  }

  async cerrar(): Promise<void> {
    await this.conexion.close().catch(() => undefined);
  }
}
