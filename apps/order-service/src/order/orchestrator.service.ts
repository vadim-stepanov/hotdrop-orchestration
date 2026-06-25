import { Injectable, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { status as GrpcStatus } from "@grpc/grpc-js";
import {
  AssignCourierResult,
  AuthorizePaymentResult,
  OrderEvent,
  ReservePortionsResult,
  SagaCommand,
  SagaReply,
} from "@hotdrop/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { sagaOutbox } from "./saga-outbox";
import type { Prisma } from "../generated/prisma/client";

type Tx = Prisma.TransactionClient;
type OrderRow = { id: string; customerId: string; status: string; deliveryAddress: string; totalCents: number };
type SagaRow = { orderId: string; reservationId: string | null; paymentId: string | null; assignmentId: string | null };

const TERMINAL = new Set(["COMPLETED", "CANCELLED", "REJECTED"]);
// Customer cancellation is allowed only before the kitchen starts cooking.
const CANCELLABLE = new Set(["PLACED", "PORTIONS_RESERVED", "PAYMENT_AUTHORIZED"]);

// The central Order Orchestrator: a durable state machine. It reacts to
// saga replies and the delivery event, advances the order, sends the next command — or,
// on a failed step, compensates the already-acquired resources in reverse — all in one
// local transaction with the inbox/outbox so it is exactly-once and restart-safe.
@Injectable()
export class SagaOrchestrator {
  private readonly logger = new Logger(SagaOrchestrator.name);

  constructor(private readonly prisma: PrismaService) {}

  onReply(messageId: string, reply: SagaReply): Promise<void> {
    return this.consume(messageId, async (tx) => {
      const order = await tx.order.findUnique({ where: { id: reply.orderId } });
      const saga = await tx.sagaInstance.findUnique({ where: { orderId: reply.orderId } });
      if (!order || !saga || TERMINAL.has(order.status)) {
        return;
      }
      if (reply.status === "failed") {
        await this.compensate(tx, order, saga, reply);
        return;
      }
      await this.advance(tx, order, saga, reply);
    });
  }

  onDelivered(messageId: string, orderId: string): Promise<void> {
    return this.consume(messageId, async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      const saga = await tx.sagaInstance.findUnique({ where: { orderId } });
      if (!order || !saga || order.status !== "COURIER_ASSIGNED" || !saga.paymentId) {
        return;
      }
      await this.setStatus(tx, order, "DELIVERED");
      await tx.sagaInstance.update({ where: { orderId }, data: { step: "CapturePayment" } });
      await this.emit(tx, SagaCommand.CapturePayment, { orderId, paymentId: saga.paymentId });
    });
  }

  // Customer-initiated cancellation (gateway → gRPC). Allowed before preparation; runs
  // the same reverse compensations (void hold + release portions) and cancels.
  async cancelOrder(orderId: string, customerId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      const saga = await tx.sagaInstance.findUnique({ where: { orderId } });
      if (!order || !saga || order.customerId !== customerId) {
        throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: `order ${orderId} not found` });
      }
      if (order.status === "CANCELLED") {
        return; // idempotent
      }
      if (!CANCELLABLE.has(order.status)) {
        throw new RpcException({
          code: GrpcStatus.FAILED_PRECONDITION,
          message: `order ${orderId} cannot be cancelled in status ${order.status}`,
        });
      }
      if (saga.paymentId) {
        await this.emit(tx, SagaCommand.VoidPayment, { orderId, paymentId: saga.paymentId });
      }
      if (saga.reservationId) {
        await this.emit(tx, SagaCommand.ReleasePortions, { orderId, reservationId: saga.reservationId });
      }
      await this.setStatus(tx, order, "CANCELLED");
      await tx.sagaInstance.update({
        where: { orderId },
        data: { compensating: true, lastError: "CANCELLED_BY_CUSTOMER" },
      });
      await this.emit(tx, OrderEvent.Cancelled, {
        orderId,
        customerId: order.customerId,
        reason: "CANCELLED_BY_CUSTOMER",
      });
    });
  }

  // Forward transitions: each ok reply moves the order on and issues the next command.
  private async advance(tx: Tx, order: OrderRow, saga: SagaRow, reply: SagaReply): Promise<void> {
    switch (reply.step) {
      case "ReservePortions": {
        const { reservationId } = reply.data as ReservePortionsResult;
        await this.setStatus(tx, order, "PORTIONS_RESERVED");
        await tx.sagaInstance.update({
          where: { orderId: order.id },
          data: { reservationId, step: "AuthorizePayment" },
        });
        await this.emit(tx, SagaCommand.AuthorizePayment, {
          orderId: order.id,
          customerId: order.customerId,
          amountCents: order.totalCents,
        });
        break;
      }
      case "AuthorizePayment": {
        const { paymentId } = reply.data as AuthorizePaymentResult;
        await this.setStatus(tx, order, "PAYMENT_AUTHORIZED");
        await tx.sagaInstance.update({
          where: { orderId: order.id },
          data: { paymentId, step: "AcceptOrder" },
        });
        await this.emit(tx, SagaCommand.AcceptOrder, { orderId: order.id });
        break;
      }
      case "AcceptOrder": {
        await this.setStatus(tx, order, "PREPARING");
        await tx.sagaInstance.update({ where: { orderId: order.id }, data: { step: "AssignCourier" } });
        await this.emit(tx, OrderEvent.Confirmed, { orderId: order.id, customerId: order.customerId });
        await this.emit(tx, SagaCommand.AssignCourier, {
          orderId: order.id,
          deliveryAddress: order.deliveryAddress,
        });
        break;
      }
      case "AssignCourier": {
        const { assignmentId } = reply.data as AssignCourierResult;
        await this.setStatus(tx, order, "COURIER_ASSIGNED");
        await tx.sagaInstance.update({
          where: { orderId: order.id },
          data: { assignmentId, step: "AwaitDelivery" },
        });
        // No command: the delivery completes asynchronously (DeliveryDelivered event).
        break;
      }
      case "CapturePayment": {
        await this.setStatus(tx, order, "COMPLETED");
        await tx.sagaInstance.update({ where: { orderId: order.id }, data: { step: "Completed" } });
        await this.emit(tx, OrderEvent.Completed, { orderId: order.id, customerId: order.customerId });
        break;
      }
    }
  }

  // A failed step: reservation failure rejects the order (nothing acquired); any later
  // failure compensates the acquired resources in reverse, then cancels.
  private async compensate(tx: Tx, order: OrderRow, saga: SagaRow, reply: SagaReply): Promise<void> {
    const reason = reply.reason ?? "saga step failed";
    if (reply.step === "ReservePortions") {
      await this.setStatus(tx, order, "REJECTED");
      await tx.sagaInstance.update({ where: { orderId: order.id }, data: { compensating: true, lastError: reason } });
      await this.emit(tx, OrderEvent.Rejected, { orderId: order.id, customerId: order.customerId, reason });
      return;
    }
    if (saga.assignmentId) {
      await this.emit(tx, SagaCommand.UnassignCourier, { orderId: order.id, assignmentId: saga.assignmentId });
    }
    if (saga.paymentId) {
      await this.emit(tx, SagaCommand.VoidPayment, { orderId: order.id, paymentId: saga.paymentId });
    }
    if (saga.reservationId) {
      await this.emit(tx, SagaCommand.ReleasePortions, { orderId: order.id, reservationId: saga.reservationId });
    }
    await this.setStatus(tx, order, "CANCELLED");
    await tx.sagaInstance.update({ where: { orderId: order.id }, data: { compensating: true, lastError: reason } });
    await this.emit(tx, OrderEvent.Cancelled, { orderId: order.id, customerId: order.customerId, reason });
  }

  // Update the order status and publish OrderStatusChanged for real-time tracking — the
  // gateway forwards it over WebSockets. Emitted in the saga transaction (so it's reliable
  // and carries the trace context).
  private async setStatus(tx: Tx, order: { id: string; customerId: string }, status: string): Promise<void> {
    await tx.order.update({ where: { id: order.id }, data: { status: status as never } });
    await this.emit(tx, OrderEvent.StatusChanged, {
      orderId: order.id,
      customerId: order.customerId,
      status,
    });
  }

  private emit(tx: Tx, type: string, payload: unknown): Promise<unknown> {
    return tx.outboxMessage.create({ data: sagaOutbox(type, payload) });
  }

  // Atomic inbox-dedupe + state transition + outbox, mirroring the participants.
  private async consume(messageId: string, work: (tx: Tx) => Promise<void>): Promise<void> {
    if (await this.prisma.inboxMessage.findUnique({ where: { messageId } })) {
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      await work(tx);
      await tx.inboxMessage.create({ data: { messageId } });
    });
  }
}
