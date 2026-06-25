import { Controller } from "@nestjs/common";
import { Ctx, EventPattern, Payload } from "@nestjs/microservices";
import { OrderEvent } from "@hotdrop/contracts";
import { runWithTraceparent } from "@hotdrop/telemetry";
import type { OrderStatusChangedEvent } from "@hotdrop/contracts";
import type { MessageEnvelope } from "@hotdrop/messaging";
import type { RmqContext } from "@nestjs/microservices";
import { TrackingGateway } from "./tracking.gateway";

// Bridges RabbitMQ → WebSockets: consumes OrderStatusChanged on the gateway.tracking queue
// and pushes it to the order's socket room (continuing the saga trace).
@Controller()
export class StatusConsumer {
  constructor(private readonly tracking: TrackingGateway) {}

  @EventPattern(OrderEvent.StatusChanged)
  async onStatusChanged(
    @Payload() env: MessageEnvelope<OrderStatusChangedEvent>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await runWithTraceparent(env.traceparent, "gateway push_status", () => {
      this.tracking.emitStatus(env.data);
      return Promise.resolve();
    });
    ack(ctx);
  }
}

function ack(ctx: RmqContext): void {
  const channel = ctx.getChannelRef() as { ack: (msg: unknown) => void };
  channel.ack(ctx.getMessage());
}
