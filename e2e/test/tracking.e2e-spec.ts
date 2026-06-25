import { io, Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";

// Verifies real-time order tracking over WebSockets against a running stack: place an
// order, subscribe to it, and assert the saga's status changes stream in up to COMPLETED.
const BASE = process.env.GATEWAY_BASE_URL ?? "http://localhost:4000/api/v1";
const WS = process.env.GATEWAY_WS_URL ?? "http://localhost:4000";
const USER = "ws-customer";

let socket: Socket | undefined;
afterEach(() => {
  socket?.disconnect();
  socket = undefined;
});

describe("order tracking (WebSocket e2e)", () => {
  it("streams saga status changes up to COMPLETED", async () => {
    const placed = (await (
      await fetch(`${BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": USER },
        body: JSON.stringify({ deliveryAddress: "7 WS St", lines: [{ dropId: "drop-tonkotsu", qty: 1 }] }),
      })
    ).json()) as { orderId: string };

    const statuses: string[] = [];
    const reachedCompleted = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`statuses seen: ${statuses.join(",")}`)), 25_000);
      socket = io(WS, { transports: ["websocket"] });
      socket.on("connect", () => socket?.emit("track", { orderId: placed.orderId }));
      socket.on("status", (msg: { orderId: string; status: string }) => {
        if (msg.orderId !== placed.orderId) return;
        statuses.push(msg.status);
        if (msg.status === "COMPLETED") {
          clearTimeout(timer);
          resolve();
        }
      });
    });

    await reachedCompleted;
    expect(statuses).toContain("COMPLETED");
    // saw real-time progression, not just the terminal state
    expect(statuses.length).toBeGreaterThan(1);
  });
});
