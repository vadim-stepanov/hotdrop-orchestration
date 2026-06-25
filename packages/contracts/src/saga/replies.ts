// Saga replies: participant → orchestrator. A single routing key the orchestrator's
// queue binds to; the orchestrator advances (or compensates) its persisted state machine
// from the reply. Forward steps reply ok/failed; the orchestrator never blocks awaiting.

export const SAGA_REPLY = "saga.reply";

export type SagaStep =
  | "ReservePortions"
  | "AuthorizePayment"
  | "AcceptOrder"
  | "AssignCourier"
  | "CapturePayment";

export interface SagaReply<T = unknown> {
  orderId: string;
  step: SagaStep;
  status: "ok" | "failed";
  /** Present (machine-readable) when status === "failed", e.g. "SOLD_OUT", "NO_COURIER". */
  reason?: string;
  /** Step result on success, e.g. { reservationId } / { paymentId } / { assignmentId }. */
  data?: T;
}

// Thrown by a participant when a forward step fails (sold out, payment declined, no
// courier). Raised inside the handler's transaction so the domain change rolls back; the
// carried failed reply is then published so the orchestrator can compensate.
export class SagaStepFailure extends Error {
  constructor(public readonly reply: SagaReply) {
    super(reply.reason ?? "saga step failed");
    this.name = "SagaStepFailure";
  }
}

export interface ReservePortionsResult {
  reservationId: string;
}
export interface AuthorizePaymentResult {
  paymentId: string;
}
export interface AssignCourierResult {
  assignmentId: string;
  courierId: string;
}
