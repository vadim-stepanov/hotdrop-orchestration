import { Injectable } from "@nestjs/common";
import { SAGA_REPLY, SagaReply, SagaStepFailure } from "@hotdrop/contracts";
import type {
  AuthorizePaymentCommand,
  CapturePaymentCommand,
  RefundPaymentCommand,
  VoidPaymentCommand,
} from "@hotdrop/contracts";
import { createOutboxMessage } from "@hotdrop/messaging";
import { AppConfigService } from "../config/config.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "../generated/prisma/client";

type Tx = Prisma.TransactionClient;
type Work = (tx: Tx) => Promise<SagaReply | null>;

// Emulated payment gateway: simulated latency + a configurable decline rate, idempotent
// by orderId (a retried authorize returns the same payment, never double-charges).
@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async authorize(messageId: string, cmd: AuthorizePaymentCommand): Promise<void> {
    await this.delay(this.config.paymentLatencyMs);
    const declined = Math.random() < this.config.paymentFailureRate;
    await this.consume(messageId, async (tx) => {
      const existing = await tx.payment.findUnique({ where: { orderId: cmd.orderId } });
      if (existing) {
        return {
          orderId: cmd.orderId,
          step: "AuthorizePayment",
          status: "ok",
          data: { paymentId: existing.id },
        };
      }
      if (declined) {
        throw new SagaStepFailure({
          orderId: cmd.orderId,
          step: "AuthorizePayment",
          status: "failed",
          reason: "PAYMENT_DECLINED",
        });
      }
      const payment = await tx.payment.create({
        data: { orderId: cmd.orderId, status: "AUTHORIZED", amountCents: cmd.amountCents },
      });
      return {
        orderId: cmd.orderId,
        step: "AuthorizePayment",
        status: "ok",
        data: { paymentId: payment.id },
      };
    });
  }

  capture(messageId: string, cmd: CapturePaymentCommand): Promise<void> {
    return this.consume(messageId, async (tx) => {
      await tx.payment.update({ where: { id: cmd.paymentId }, data: { status: "CAPTURED" } });
      return { orderId: cmd.orderId, step: "CapturePayment", status: "ok" };
    });
  }

  // Compensations: void a not-yet-captured hold / refund a captured payment. Idempotent.
  voidPayment(messageId: string, cmd: VoidPaymentCommand): Promise<void> {
    return this.consume(messageId, async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: cmd.paymentId } });
      if (payment && payment.status === "AUTHORIZED") {
        await tx.payment.update({ where: { id: cmd.paymentId }, data: { status: "VOIDED" } });
      }
      return null;
    });
  }

  refund(messageId: string, cmd: RefundPaymentCommand): Promise<void> {
    return this.consume(messageId, async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: cmd.paymentId } });
      if (payment && payment.status !== "REFUNDED") {
        await tx.payment.update({ where: { id: cmd.paymentId }, data: { status: "REFUNDED" } });
      }
      return null;
    });
  }

  private async consume(messageId: string, work: Work): Promise<void> {
    if (await this.prisma.inboxMessage.findUnique({ where: { messageId } })) {
      return;
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        const reply = await work(tx);
        if (reply) {
          await tx.outboxMessage.create({ data: this.outbox(reply) });
        }
        await tx.inboxMessage.create({ data: { messageId } });
      });
    } catch (error) {
      if (error instanceof SagaStepFailure) {
        await this.prisma.$transaction(async (tx) => {
          await tx.outboxMessage.create({ data: this.outbox(error.reply) });
          await tx.inboxMessage.create({ data: { messageId } });
        });
        return;
      }
      throw error;
    }
  }

  private outbox(reply: SagaReply): {
    id: string;
    type: string;
    payload: Prisma.InputJsonValue;
    traceParent: string | null;
  } {
    const message = createOutboxMessage(SAGA_REPLY, reply);
    return {
      id: message.id,
      type: message.type,
      payload: message.payload as Prisma.InputJsonValue,
      traceParent: message.traceparent ?? null,
    };
  }

  private delay(ms: number): Promise<void> {
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }
}
