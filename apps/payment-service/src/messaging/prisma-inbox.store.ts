import { Injectable } from "@nestjs/common";
import { InboxStore } from "@hotdrop/messaging";
import { PrismaService } from "../prisma/prisma.service";

// Prisma adapter for the inbox port: idempotent-consume bookkeeping.
@Injectable()
export class PrismaInboxStore implements InboxStore {
  constructor(private readonly prisma: PrismaService) {}

  async hasProcessed(messageId: string): Promise<boolean> {
    const found = await this.prisma.inboxMessage.findUnique({ where: { messageId } });
    return found !== null;
  }

  async markProcessed(messageId: string): Promise<void> {
    await this.prisma.inboxMessage.create({ data: { messageId } });
  }
}
