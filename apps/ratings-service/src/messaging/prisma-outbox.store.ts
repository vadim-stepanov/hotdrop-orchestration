import { Injectable } from "@nestjs/common";
import { OutboxMessage, OutboxStore } from "@hotdrop/messaging";
import { PrismaService } from "../prisma/prisma.service";

// Prisma adapter for the outbox port over this service's outbox table.
@Injectable()
export class PrismaOutboxStore implements OutboxStore {
  constructor(private readonly prisma: PrismaService) {}

  async findUnpublished(limit: number): Promise<OutboxMessage[]> {
    const rows = await this.prisma.outboxMessage.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      payload: r.payload,
      createdAt: r.createdAt,
      publishedAt: r.publishedAt,
      traceparent: r.traceParent,
    }));
  }

  async markPublished(ids: string[]): Promise<void> {
    await this.prisma.outboxMessage.updateMany({
      where: { id: { in: ids } },
      data: { publishedAt: new Date() },
    });
  }
}
