// Delivery progress reported by dispatch (emulated courier). The orchestrator's queue
// binds this alongside saga replies; on delivery it issues the final CapturePayment.

export const DeliveryEvent = {
  Delivered: "event.delivery.delivered",
} as const;
export type DeliveryEvent = (typeof DeliveryEvent)[keyof typeof DeliveryEvent];

export interface DeliveryDeliveredEvent {
  orderId: string;
}
