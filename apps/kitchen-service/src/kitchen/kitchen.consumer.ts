import { Controller } from "@nestjs/common";
import { Ctx, EventPattern, Payload } from "@nestjs/microservices";
import { SagaCommand } from "@hotdrop/contracts";
import { runWithTraceparent } from "@hotdrop/telemetry";
import type {
  AcceptOrderCommand,
  ReleasePortionsCommand,
  ReservePortionsCommand,
} from "@hotdrop/contracts";
import type { MessageEnvelope } from "@hotdrop/messaging";
import type { RmqContext } from "@nestjs/microservices";
import { KitchenService } from "./kitchen.service";

// Consumes saga commands routed to the kitchen.commands queue. Each handler continues the
// originating saga trace (env.traceparent), dedupes, does its work, and writes its reply to
// the outbox in one transaction, then acks.
@Controller()
export class KitchenConsumer {
  constructor(private readonly kitchen: KitchenService) {}

  @EventPattern(SagaCommand.ReservePortions)
  async onReserve(
    @Payload() env: MessageEnvelope<ReservePortionsCommand>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await runWithTraceparent(env.traceparent, "kitchen reserve_portions", () =>
      this.kitchen.reservePortions(env.messageId, env.data),
    );
    ack(ctx);
  }

  @EventPattern(SagaCommand.ReleasePortions)
  async onRelease(
    @Payload() env: MessageEnvelope<ReleasePortionsCommand>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await runWithTraceparent(env.traceparent, "kitchen release_portions", () =>
      this.kitchen.releasePortions(env.messageId, env.data),
    );
    ack(ctx);
  }

  @EventPattern(SagaCommand.AcceptOrder)
  async onAccept(
    @Payload() env: MessageEnvelope<AcceptOrderCommand>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await runWithTraceparent(env.traceparent, "kitchen accept_order", () =>
      this.kitchen.acceptOrder(env.messageId, env.data),
    );
    ack(ctx);
  }
}

function ack(ctx: RmqContext): void {
  const channel = ctx.getChannelRef() as { ack: (msg: unknown) => void };
  channel.ack(ctx.getMessage());
}
