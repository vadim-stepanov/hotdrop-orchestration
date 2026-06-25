import { createOutboxMessage } from "@hotdrop/messaging";
import type { Prisma } from "../generated/prisma/client";

// Build a Prisma outbox-row payload for a saga command or domain event. The relay
// publishes it; the row id rides as the message envelope's messageId.
export function sagaOutbox(
  type: string,
  payload: unknown,
): { id: string; type: string; payload: Prisma.InputJsonValue; traceParent: string | null } {
  const message = createOutboxMessage(type, payload);
  return {
    id: message.id,
    type: message.type,
    payload: message.payload as Prisma.InputJsonValue,
    traceParent: message.traceparent ?? null,
  };
}
