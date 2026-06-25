import { Injectable, Logger } from "@nestjs/common";
import { DeliveryEvent, SAGA_REPLY, SagaReply, SagaStepFailure } from "@hotdrop/contracts";
import type { AssignCourierCommand, UnassignCourierCommand } from "@hotdrop/contracts";
import { createOutboxMessage } from "@hotdrop/messaging";
import { AppConfigService } from "../config/config.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "../generated/prisma/client";

type Tx = Prisma.TransactionClient;
type Work = (tx: Tx) => Promise<SagaReply | null>;
type OutboxRow = { id: string; type: string; payload: Prisma.InputJsonValue; traceParent: string | null };

const MAX_COURIER_OFFERS = 3;
const DELIVERY_SIMULATION_MS = 500;

// Emulated gig dispatch: offer the order to candidate couriers (each declines with a
// configurable probability); on acceptance create the assignment + delivery, otherwise
// exhaust candidates → NO_COURIER (the saga compensates).
@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async assignCourier(messageId: string, cmd: AssignCourierCommand): Promise<void> {
    await this.delay(this.config.courierLatencyMs);
    const courierId = this.matchCourier();
    await this.consume(messageId, async (tx) => {
      if (!courierId) {
        throw new SagaStepFailure({
          orderId: cmd.orderId,
          step: "AssignCourier",
          status: "failed",
          reason: "NO_COURIER",
        });
      }
      const assignment = await tx.courierAssignment.create({
        data: { orderId: cmd.orderId, courierId, status: "ACCEPTED" },
      });
      await tx.delivery.create({
        data: { orderId: cmd.orderId, assignmentId: assignment.id, status: "ASSIGNED" },
      });
      return {
        orderId: cmd.orderId,
        step: "AssignCourier",
        status: "ok",
        data: { assignmentId: assignment.id, courierId },
      };
    });
    // Emulated courier: after a short delay the delivery completes and the orchestrator
    // is notified (DeliveryDelivered) so it can capture payment.
    if (courierId) {
      setTimeout(() => void this.completeDelivery(cmd.orderId), DELIVERY_SIMULATION_MS);
    }
  }

  private async completeDelivery(orderId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const delivery = await tx.delivery.findUnique({ where: { orderId } });
        if (!delivery || delivery.status === "DELIVERED") {
          return;
        }
        await tx.delivery.update({ where: { orderId }, data: { status: "DELIVERED" } });
        await tx.outboxMessage.create({
          data: this.outboxData(DeliveryEvent.Delivered, { orderId }),
        });
      });
    } catch (error) {
      this.logger.error(
        `delivery completion failed for ${orderId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // Compensation: cancel the assignment (idempotent). No reply.
  unassignCourier(messageId: string, cmd: UnassignCourierCommand): Promise<void> {
    return this.consume(messageId, async (tx) => {
      const assignment = await tx.courierAssignment.findUnique({ where: { id: cmd.assignmentId } });
      if (assignment && assignment.status !== "CANCELLED") {
        await tx.courierAssignment.update({
          where: { id: cmd.assignmentId },
          data: { status: "CANCELLED" },
        });
      }
      return null;
    });
  }

  // Offer to up to N candidates; the first that doesn't decline takes it.
  private matchCourier(): string | null {
    for (let offer = 0; offer < MAX_COURIER_OFFERS; offer += 1) {
      if (Math.random() >= this.config.courierDeclineRate) {
        return `courier-${crypto.randomUUID().slice(0, 8)}`;
      }
    }
    return null;
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

  private outbox(reply: SagaReply): OutboxRow {
    return this.outboxData(SAGA_REPLY, reply);
  }

  private outboxData(type: string, payload: unknown): OutboxRow {
    const message = createOutboxMessage(type, payload);
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
