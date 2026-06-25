import { context, propagation } from "@opentelemetry/api";
import { NewOutboxMessage } from "./types";

// Build an outbox row to persist inside the same local transaction as the domain change
// (transactional outbox). Captures the active trace context as a W3C traceparent so the
// saga stays one trace across the async hop. `crypto.randomUUID` is native.
export function createOutboxMessage(type: string, payload: unknown): NewOutboxMessage {
  const carrier: { traceparent?: string } = {};
  propagation.inject(context.active(), carrier);
  return { id: crypto.randomUUID(), type, payload, traceparent: carrier.traceparent };
}
