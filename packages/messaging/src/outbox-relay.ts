import { OutboxStore } from "./ports";
import { OutboxMessage } from "./types";

export type PublishFn = (message: OutboxMessage) => Promise<void>;

// Polls the outbox and republishes unpublished messages to the broker, preserving order.
// On a publish failure it stops the batch (ids published so far are still marked) and
// retries the rest on the next tick — at-least-once delivery; consumers dedupe via the
// inbox. The service schedules tick() on an interval and supplies the publish function.
export class OutboxRelay {
  constructor(
    private readonly store: OutboxStore,
    private readonly publish: PublishFn,
    private readonly batchSize = 50,
  ) {}

  async tick(): Promise<number> {
    const pending = await this.store.findUnpublished(this.batchSize);
    const published: string[] = [];
    try {
      for (const message of pending) {
        await this.publish(message);
        published.push(message.id);
      }
    } finally {
      if (published.length > 0) {
        await this.store.markPublished(published);
      }
    }
    return published.length;
  }
}
