// Cross-service enums shared across the saga. Values are stable strings (stored in DBs,
// carried in messages, surfaced in the REST contract) — do not renumber/reword lightly.

/** Order aggregate lifecycle. Source of truth lives in order-service. */
export enum OrderStatus {
  PLACED = "PLACED",
  PORTIONS_RESERVED = "PORTIONS_RESERVED",
  PAYMENT_AUTHORIZED = "PAYMENT_AUTHORIZED",
  ACCEPTED = "ACCEPTED",
  PREPARING = "PREPARING",
  READY = "READY",
  COURIER_ASSIGNED = "COURIER_ASSIGNED",
  PICKED_UP = "PICKED_UP",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
}

/** Drop lifecycle. Owned by kitchen-service. */
export enum DropStatus {
  DRAFT = "DRAFT",
  SCHEDULED = "SCHEDULED",
  LIVE = "LIVE",
  SOLD_OUT = "SOLD_OUT",
  CLOSED = "CLOSED",
}

/** Emulated payment lifecycle. Owned by payment-service. */
export enum PaymentStatus {
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  VOIDED = "VOIDED",
  REFUNDED = "REFUNDED",
  FAILED = "FAILED",
}

/** Courier assignment lifecycle. Owned by dispatch-service. */
export enum CourierAssignmentStatus {
  OFFERED = "OFFERED",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  CANCELLED = "CANCELLED",
}

/** Delivery progress. Owned by dispatch-service. */
export enum DeliveryStatus {
  ASSIGNED = "ASSIGNED",
  PICKED_UP = "PICKED_UP",
  DELIVERED = "DELIVERED",
}
