import { Controller } from "@nestjs/common";
import { Ctx, EventPattern, Payload } from "@nestjs/microservices";
import { DeliveryEvent, SAGA_REPLY } from "@hotdrop/contracts";
import { runWithTraceparent } from "@hotdrop/telemetry";
import type { DeliveryDeliveredEvent, SagaReply } from "@hotdrop/contracts";
import type { MessageEnvelope } from "@hotdrop/messaging";
import type { RmqContext } from "@nestjs/microservices";
import { SagaOrchestrator } from "./orchestrator.service";

// The orchestrator's inbound side: saga replies from participants + the delivery event,
// both routed to the order.saga queue. Each continues the originating saga trace.
@Controller()
export class OrderConsumer {
  constructor(private readonly orchestrator: SagaOrchestrator) {}

  @EventPattern(SAGA_REPLY)
  async onReply(
    @Payload() env: MessageEnvelope<SagaReply>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await runWithTraceparent(env.traceparent, `saga reply ${env.data.step}`, () =>
      this.orchestrator.onReply(env.messageId, env.data),
    );
    ack(ctx);
  }

  @EventPattern(DeliveryEvent.Delivered)
  async onDelivered(
    @Payload() env: MessageEnvelope<DeliveryDeliveredEvent>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await runWithTraceparent(env.traceparent, "saga delivery_delivered", () =>
      this.orchestrator.onDelivered(env.messageId, env.data.orderId),
    );
    ack(ctx);
  }
}

function ack(ctx: RmqContext): void {
  const channel = ctx.getChannelRef() as { ack: (msg: unknown) => void };
  channel.ack(ctx.getMessage());
}
