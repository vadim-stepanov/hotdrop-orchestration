// Wire format for every published message. The outbox row id travels as `messageId` so
// consumers can dedupe via the inbox (RabbitMQ delivers at-least-once); `data` is the
// domain command/reply/event payload.
export interface MessageEnvelope<T = unknown> {
  messageId: string;
  data: T;
  /** W3C traceparent so the consumer can continue the originating trace. */
  traceparent?: string;
}
