import { Injectable } from "@nestjs/common";
import { SAGA_REPLY, SagaReply, SagaStepFailure } from "@hotdrop/contracts";
import type {
  AcceptOrderCommand,
  ReleasePortionsCommand,
  ReservePortionsCommand,
} from "@hotdrop/contracts";
import { createOutboxMessage } from "@hotdrop/messaging";
import { AppConfigService } from "../config/config.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "../generated/prisma/client";

type Tx = Prisma.TransactionClient;
type Work = (tx: Tx) => Promise<SagaReply | null>;

@Injectable()
export class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  // ReservePortions — the saga's first failable step. Each line is an atomic conditional
  // decrement; a short line throws SagaStepFailure → the transaction rolls back any
  // earlier decrements, and a SOLD_OUT reply is sent instead. Row locks serialize a race
  // for the last portions, so the inventory is never oversold.
  reservePortions(messageId: string, cmd: ReservePortionsCommand): Promise<void> {
    return this.consume(messageId, async (tx) => {
      for (const line of cmd.lines) {
        const res = await tx.drop.updateMany({
          where: { id: line.dropId, available: { gte: line.qty } },
          data: { available: { decrement: line.qty }, reserved: { increment: line.qty } },
        });
        if (res.count === 0) {
          throw new SagaStepFailure({
            orderId: cmd.orderId,
            step: "ReservePortions",
            status: "failed",
            reason: "SOLD_OUT",
          });
        }
      }
      const expiresAt = new Date(Date.now() + this.config.portionReservationTtlSeconds * 1000);
      const reservation = await tx.reservation.create({
        data: {
          orderId: cmd.orderId,
          expiresAt,
          items: { create: cmd.lines.map((l) => ({ dropId: l.dropId, qty: l.qty })) },
        },
      });
      return {
        orderId: cmd.orderId,
        step: "ReservePortions",
        status: "ok",
        data: { reservationId: reservation.id },
      };
    });
  }

  // ReleasePortions — compensation: restore inventory and mark the reservation released.
  // Idempotent (already-released reservation is a no-op). No reply.
  releasePortions(messageId: string, cmd: ReleasePortionsCommand): Promise<void> {
    return this.consume(messageId, async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: cmd.reservationId },
        include: { items: true },
      });
      if (!reservation || reservation.status === "RELEASED") {
        return null;
      }
      for (const item of reservation.items) {
        await tx.drop.update({
          where: { id: item.dropId },
          data: { available: { increment: item.qty }, reserved: { decrement: item.qty } },
        });
      }
      await tx.reservation.update({ where: { id: reservation.id }, data: { status: "RELEASED" } });
      return null;
    });
  }

  // AcceptOrder — the kitchen commits to cook (emulated: always accepts). Confirms the
  // reservation and replies ok.
  acceptOrder(messageId: string, cmd: AcceptOrderCommand): Promise<void> {
    return this.consume(messageId, async (tx) => {
      await tx.reservation.update({
        where: { orderId: cmd.orderId },
        data: { status: "CONFIRMED" },
      });
      return { orderId: cmd.orderId, step: "AcceptOrder", status: "ok" };
    });
  }

  // Background safety net: release portions held by reservations whose TTL
  // lapsed while still HELD (a saga that stalled before payment/accept). Confirmed
  // reservations are untouched. Returns how many were released.
  async releaseExpiredReservations(): Promise<number> {
    const expired = await this.prisma.reservation.findMany({
      where: { status: "HELD", expiresAt: { lt: new Date() } },
      include: { items: true },
    });
    let released = 0;
    for (const reservation of expired) {
      const didRelease = await this.prisma.$transaction(async (tx) => {
        const current = await tx.reservation.findUnique({ where: { id: reservation.id } });
        if (!current || current.status !== "HELD") {
          return false; // accepted/released concurrently
        }
        for (const item of reservation.items) {
          await tx.drop.update({
            where: { id: item.dropId },
            data: { available: { increment: item.qty }, reserved: { decrement: item.qty } },
          });
        }
        await tx.reservation.update({ where: { id: reservation.id }, data: { status: "RELEASED" } });
        return true;
      });
      if (didRelease) {
        released += 1;
      }
    }
    return released;
  }

  // Atomic inbox-dedupe + domain + reply. A SagaStepFailure rolls the work back and is
  // re-published as a failed reply in its own transaction; other errors propagate (nack).
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
}
