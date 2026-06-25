// RabbitMQ topology shared by every service. A single topic exchange
// carries three routing-key planes:
//   - saga commands  "<service>.cmd.<action>"   (orchestrator → participant, point-to-point)
//   - saga replies    "saga.reply"               (participant → orchestrator)
//   - domain events   "event.<aggregate>.<name>" (pub/sub fan-out to reactors)
// Each consumer owns a durable queue bound to the routing keys it handles.

export const HOTDROP_EXCHANGE = "hotdrop";

/** Durable queues — one per consuming service. */
export const Queue = {
  /** Orchestrator (order-service): consumes saga replies. */
  OrderSaga: "order.saga",
  KitchenCommands: "kitchen.commands",
  PaymentCommands: "payment.commands",
  DispatchCommands: "dispatch.commands",
  /** Event reactor: consumes domain events. */
  Notifications: "notifications",
  /** Gateway: consumes order status changes to push over WebSockets. */
  GatewayTracking: "gateway.tracking",
} as const;
