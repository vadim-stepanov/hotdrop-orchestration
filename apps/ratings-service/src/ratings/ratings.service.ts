import { Injectable } from "@nestjs/common";
import { SUPPORT_TICKET_CREATED, SupportTicketCreatedEvent } from "@hotdrop/contracts";
import { createOutboxMessage } from "@hotdrop/messaging";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "../generated/prisma/client";

export interface ProtoRating {
  id: string;
  dropId: string;
  customerId: string;
  score: number;
  comment: string;
  createdAt: string;
}
export interface ProtoSupportTicket {
  id: string;
  customerId: string;
  subject: string;
  createdAt: string;
}

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRating(input: {
    orderId: string;
    dropId: string;
    customerId: string;
    score: number;
    comment: string;
  }): Promise<ProtoRating> {
    const rating = await this.prisma.rating.create({
      data: {
        orderId: input.orderId,
        dropId: input.dropId,
        customerId: input.customerId,
        score: input.score,
        comment: input.comment.length > 0 ? input.comment : null,
      },
    });
    return {
      id: rating.id,
      dropId: rating.dropId,
      customerId: rating.customerId,
      score: rating.score,
      comment: rating.comment ?? "",
      createdAt: rating.createdAt.toISOString(),
    };
  }

  async listRatings(dropId: string): Promise<ProtoRating[]> {
    const ratings = await this.prisma.rating.findMany({
      where: { dropId },
      orderBy: { createdAt: "desc" },
    });
    return ratings.map((r) => ({
      id: r.id,
      dropId: r.dropId,
      customerId: r.customerId,
      score: r.score,
      comment: r.comment ?? "",
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // Persist the ticket and emit SupportTicketCreated in one transaction (transactional
  // outbox) → notifications reacts.
  async createSupportTicket(input: {
    customerId: string;
    subject: string;
    body: string;
  }): Promise<ProtoSupportTicket> {
    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: { customerId: input.customerId, subject: input.subject, body: input.body },
      });
      const event: SupportTicketCreatedEvent = {
        ticketId: created.id,
        customerId: created.customerId,
        subject: created.subject,
      };
      const message = createOutboxMessage(SUPPORT_TICKET_CREATED, event);
      await tx.outboxMessage.create({
        data: {
          id: message.id,
          type: message.type,
          payload: message.payload as Prisma.InputJsonValue,
          traceParent: message.traceparent ?? null,
        },
      });
      return created;
    });
    return {
      id: ticket.id,
      customerId: ticket.customerId,
      subject: ticket.subject,
      createdAt: ticket.createdAt.toISOString(),
    };
  }
}
