import { InboxStore } from "./ports";

// Idempotent consume: runs the handler at most once per messageId. RabbitMQ delivers
// at-least-once, so duplicates are expected. The Prisma adapter should mark-processed
// within the handler's transaction for an exactly-once effect.
export class InboxGuard {
  constructor(private readonly store: InboxStore) {}

  /** Returns true if the handler ran, false if the message was already processed. */
  async process(messageId: string, handler: () => Promise<void>): Promise<boolean> {
    if (await this.store.hasProcessed(messageId)) {
      return false;
    }
    await handler();
    await this.store.markProcessed(messageId);
    return true;
  }
}
