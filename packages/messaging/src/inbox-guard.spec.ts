import { describe, expect, it } from "vitest";
import { InboxGuard } from "./inbox-guard";
import { InboxStore } from "./ports";

class FakeInboxStore implements InboxStore {
  private readonly seen = new Set<string>();
  hasProcessed(messageId: string): Promise<boolean> {
    return Promise.resolve(this.seen.has(messageId));
  }
  markProcessed(messageId: string): Promise<void> {
    this.seen.add(messageId);
    return Promise.resolve();
  }
}

describe("InboxGuard", () => {
  it("runs the handler once for a new message and marks it processed", async () => {
    const guard = new InboxGuard(new FakeInboxStore());
    let runs = 0;

    const ran = await guard.process("m1", () => {
      runs += 1;
      return Promise.resolve();
    });

    expect(ran).toBe(true);
    expect(runs).toBe(1);
  });

  it("skips the handler for a duplicate message", async () => {
    const guard = new InboxGuard(new FakeInboxStore());
    let runs = 0;
    const handler = (): Promise<void> => {
      runs += 1;
      return Promise.resolve();
    };

    await guard.process("m1", handler);
    const second = await guard.process("m1", handler);

    expect(second).toBe(false);
    expect(runs).toBe(1);
  });
});
