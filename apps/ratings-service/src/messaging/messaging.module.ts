import { Global, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { HOTDROP_EXCHANGE } from "@hotdrop/contracts";
import { InboxGuard } from "@hotdrop/messaging";
import { AppConfigService } from "../config/config.service";
import { EVENT_BUS } from "./messaging.constants";
import { OutboxRelayRunner } from "./outbox-relay.runner";
import { PrismaInboxStore } from "./prisma-inbox.store";
import { PrismaOutboxStore } from "./prisma-outbox.store";

// Outbound transport: a RabbitMQ ClientProxy plus the outbox relay that publishes from it.
// Inbound idempotency is provided by InboxGuard (backed by the Prisma inbox adapter).
// Command/reply/event handlers (later steps) write to the outbox in their own transaction;
// the relay does the actual publishing.
@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: EVENT_BUS,
        inject: [AppConfigService],
        useFactory: (config: AppConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.rabbitmqUrl],
            exchange: HOTDROP_EXCHANGE,
            exchangeType: "topic",
            wildcards: true,
          },
        }),
      },
    ]),
  ],
  providers: [
    PrismaOutboxStore,
    PrismaInboxStore,
    OutboxRelayRunner,
    {
      provide: InboxGuard,
      useFactory: (store: PrismaInboxStore) => new InboxGuard(store),
      inject: [PrismaInboxStore],
    },
  ],
  exports: [InboxGuard],
})
export class MessagingModule {}
