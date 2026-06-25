import { describe, expect, it } from "vitest";
import { OutboxRelay } from "./outbox-relay";
import { OutboxStore } from "./ports";
import { OutboxMessage } from "./types";

function msg(id: string): OutboxMessage {
  return { id, type: "event.test", payload: { id }, createdAt: new Date(0), publishedAt: null, traceparent: null };
}

class FakeOutboxStore implements OutboxStore {
  marked: string[] = [];
  constructor(private readonly pending: OutboxMessage[]) {}
  findUnpublished(limit: number): Promise<OutboxMessage[]> {
    return Promise.resolve(this.pending.slice(0, limit));
  }
  markPublished(ids: string[]): Promise<void> {
    this.marked.push(...ids);
    return Promise.resolve();
  }
}

describe("OutboxRelay", () => {
  it("publishes every pending message in order and marks them published", async () => {
    const store = new FakeOutboxStore([msg("a"), msg("b"), msg("c")]);
    const sent: string[] = [];
    const relay = new OutboxRelay(store, (m) => {
      sent.push(m.id);
      return Promise.resolve();
    });

    const count = await relay.tick();

    expect(count).toBe(3);
    expect(sent).toEqual(["a", "b", "c"]);
    expect(store.marked).toEqual(["a", "b", "c"]);
  });

  it("stops on a publish failure and marks only what was published", async () => {
    const store = new FakeOutboxStore([msg("a"), msg("b"), msg("c")]);
    const relay = new OutboxRelay(store, (m) => {
      if (m.id === "b") return Promise.reject(new Error("broker down"));
      return Promise.resolve();
    });

    await expect(relay.tick()).rejects.toThrow("broker down");
    expect(store.marked).toEqual(["a"]); // "b"/"c" retried next tick
  });
});
