/** A row in a service's outbox table. `type` is the broker routing key / message pattern. */
export interface OutboxMessage {
  id: string;
  type: string;
  payload: unknown;
  createdAt: Date;
  publishedAt: Date | null;
  /** W3C traceparent captured when the row was written, for saga-trace correlation. */
  traceparent: string | null;
}

/** The fields a producer persists; the store fills createdAt and leaves publishedAt null. */
export type NewOutboxMessage = Pick<OutboxMessage, "id" | "type" | "payload"> & {
  traceparent?: string;
};
