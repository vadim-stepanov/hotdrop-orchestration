import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { MessageEnvelope, OutboxRelay } from "@hotdrop/messaging";
import { EVENT_BUS } from "./messaging.constants";
import { PrismaOutboxStore } from "./prisma-outbox.store";

const POLL_INTERVAL_MS = 500;

// Drains the transactional outbox to RabbitMQ on a fixed interval (no extra dep — native
// setInterval). The outbox row id rides in the envelope as messageId for inbox dedupe.
@Injectable()
export class OutboxRelayRunner implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayRunner.name);
  private readonly relay: OutboxRelay;
  private timer?: NodeJS.Timeout;
  private draining = false;

  constructor(
    store: PrismaOutboxStore,
    @Inject(EVENT_BUS) private readonly client: ClientProxy,
  ) {
    this.relay = new OutboxRelay(store, async (message) => {
      const envelope: MessageEnvelope = {
        messageId: message.id,
        data: message.payload,
        traceparent: message.traceparent ?? undefined,
      };
      // emit() is fire-and-forget; its observable completes without a value, so guard
      // firstValueFrom with a default to avoid EmptyError after a successful publish.
      await firstValueFrom(this.client.emit(message.type, envelope), { defaultValue: undefined });
    });
  }

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.drain(), POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async drain(): Promise<void> {
    if (this.draining) {
      return;
    }
    this.draining = true;
    try {
      await this.relay.tick();
    } catch (error) {
      this.logger.error(
        "outbox relay tick failed",
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.draining = false;
    }
  }
}
