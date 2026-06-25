import { OutboxMessage } from "./types";

// Persistence ports: each service backs these with a thin Prisma adapter
// over its own outbox/inbox tables. The library stays free of Prisma and Nest.

export interface OutboxStore {
  /** Oldest unpublished messages, in insertion order, capped at `limit`. */
  findUnpublished(limit: number): Promise<OutboxMessage[]>;
  markPublished(ids: string[]): Promise<void>;
}

export interface InboxStore {
  hasProcessed(messageId: string): Promise<boolean>;
  markProcessed(messageId: string): Promise<void>;
}
