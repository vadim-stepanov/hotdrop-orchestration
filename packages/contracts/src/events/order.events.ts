// Domain events: pub/sub fan-out (fire-and-forget) to reactors (notifications). Emitted
// via the transactional outbox alongside the order state change.

export const OrderEvent = {
  Confirmed: "event.order.confirmed", // accepted + paid: kitchen is preparing
  Completed: "event.order.completed", // delivered + captured
  Cancelled: "event.order.cancelled", // compensated failure or customer cancel
  Rejected: "event.order.rejected", // sold out at reservation
  StatusChanged: "event.order.status_changed", // every transition → real-time tracking
} as const;
export type OrderEvent = (typeof OrderEvent)[keyof typeof OrderEvent];

export interface OrderStatusChangedEvent {
  orderId: string;
  customerId: string;
  status: string;
}

export interface OrderConfirmedEvent {
  orderId: string;
  customerId: string;
}
export interface OrderCompletedEvent {
  orderId: string;
  customerId: string;
}
export interface OrderCancelledEvent {
  orderId: string;
  customerId: string;
  reason: string;
}
export interface OrderRejectedEvent {
  orderId: string;
  customerId: string;
  reason: string;
}
