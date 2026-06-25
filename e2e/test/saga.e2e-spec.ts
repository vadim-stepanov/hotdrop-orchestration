import { describe, expect, it } from "vitest";

// Drives the frozen public contract against a running stack (pnpm dev + pnpm db:seed).
// Exercises the orchestrated saga end to end: the happy path to COMPLETED and the
// deterministic sold-out rejection (oversized qty). Seeded drop: drop-tonkotsu.
const BASE = process.env.GATEWAY_BASE_URL ?? "http://localhost:4000/api/v1";
const USER = "e2e-customer";
const DROP_ID = "drop-tonkotsu";

interface OrderResponse {
  orderId: string;
  status: string;
}
interface OrderView {
  id: string;
  status: string;
}

async function call<T>(method: string, path: string, body?: unknown, userId = USER): Promise<{ status: number; json: T }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (userId.length > 0) {
    headers["X-User-Id"] = userId;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text.length > 0 ? (JSON.parse(text) as T) : ({} as T) };
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function pollOrder(orderId: string, until: Set<string>): Promise<string> {
  for (let i = 0; i < 80; i += 1) {
    const { json } = await call<OrderView>("GET", `/orders/${orderId}`);
    if (json.status && until.has(json.status)) {
      return json.status;
    }
    await sleep(300);
  }
  throw new Error(`order ${orderId} did not reach a terminal status in time`);
}

describe("orchestrated saga (distributed e2e)", () => {
  it("happy path: place → COMPLETED → rate → appears in drop ratings", async () => {
    const placed = await call<OrderResponse>("POST", "/orders", {
      deliveryAddress: "1 Main St",
      lines: [{ dropId: DROP_ID, qty: 2 }],
    });
    expect(placed.status).toBe(201);
    expect(placed.json.status).toBe("PLACED");

    const status = await pollOrder(placed.json.orderId, new Set(["COMPLETED", "CANCELLED", "REJECTED"]));
    expect(status).toBe("COMPLETED");

    const rated = await call<{ id: string }>("POST", `/orders/${placed.json.orderId}/ratings`, {
      dropId: DROP_ID,
      score: 5,
      comment: "Best ramen",
    });
    expect(rated.status).toBe(201);

    const ratings = await call<{ id: string }[]>("GET", `/drops/${DROP_ID}/ratings`);
    expect(ratings.json.some((r) => r.id === rated.json.id)).toBe(true);
  });

  it("sold out: oversized qty → REJECTED (first saga step fails)", async () => {
    const placed = await call<OrderResponse>("POST", "/orders", {
      deliveryAddress: "2 Oak Ave",
      lines: [{ dropId: DROP_ID, qty: 100000 }],
    });
    expect(placed.status).toBe(201);

    const status = await pollOrder(placed.json.orderId, new Set(["COMPLETED", "CANCELLED", "REJECTED"]));
    expect(status).toBe("REJECTED");
  });

  it("auth required: no X-User-Id → 401", async () => {
    const res = await call("GET", "/orders", undefined, "");
    expect(res.status).toBe(401);
  });

  it("validation: qty < 1 → 400", async () => {
    const res = await call("POST", "/orders", {
      deliveryAddress: "x",
      lines: [{ dropId: DROP_ID, qty: 0 }],
    });
    expect(res.status).toBe(400);
  });

  it("support: creates a ticket (the async event path)", async () => {
    const res = await call<{ id: string }>("POST", "/support", {
      subject: "Where is my order?",
      body: "It seems late.",
    });
    expect(res.status).toBe(201);
    expect(res.json.id).toBeTruthy();
  });
});
