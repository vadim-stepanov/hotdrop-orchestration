// Saga commands: orchestrator → participant (RMQ, point-to-point, published via the
// transactional outbox). Every command carries `orderId` for correlation. Forward steps
// produce a SagaReply (see ./replies); compensations are best-effort and need no reply.

export interface OrderLineInput {
  dropId: string;
  qty: number;
}

/** Command routing keys (also the @nestjs/microservices message patterns). */
export const SagaCommand = {
  ReservePortions: "kitchen.cmd.reserve_portions",
  ReleasePortions: "kitchen.cmd.release_portions", // compensation
  AcceptOrder: "kitchen.cmd.accept_order",
  AuthorizePayment: "payment.cmd.authorize",
  CapturePayment: "payment.cmd.capture",
  VoidPayment: "payment.cmd.void", // compensation
  RefundPayment: "payment.cmd.refund", // compensation
  AssignCourier: "dispatch.cmd.assign_courier",
  UnassignCourier: "dispatch.cmd.unassign_courier", // compensation
} as const;
export type SagaCommand = (typeof SagaCommand)[keyof typeof SagaCommand];

export interface ReservePortionsCommand {
  orderId: string;
  lines: OrderLineInput[];
}
export interface ReleasePortionsCommand {
  orderId: string;
  reservationId: string;
}
export interface AcceptOrderCommand {
  orderId: string;
}
export interface AuthorizePaymentCommand {
  orderId: string;
  customerId: string;
  amountCents: number;
}
export interface CapturePaymentCommand {
  orderId: string;
  paymentId: string;
}
export interface VoidPaymentCommand {
  orderId: string;
  paymentId: string;
}
export interface RefundPaymentCommand {
  orderId: string;
  paymentId: string;
}
export interface AssignCourierCommand {
  orderId: string;
  deliveryAddress: string;
}
export interface UnassignCourierCommand {
  orderId: string;
  assignmentId: string;
}
