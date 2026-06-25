import { Controller } from "@nestjs/common";
import { Ctx, EventPattern, Payload } from "@nestjs/microservices";
import { SagaCommand } from "@hotdrop/contracts";
import { runWithTraceparent } from "@hotdrop/telemetry";
import type { AssignCourierCommand, UnassignCourierCommand } from "@hotdrop/contracts";
import type { MessageEnvelope } from "@hotdrop/messaging";
import type { RmqContext } from "@nestjs/microservices";
import { DispatchService } from "./dispatch.service";

@Controller()
export class DispatchConsumer {
  constructor(private readonly dispatch: DispatchService) {}

  @EventPattern(SagaCommand.AssignCourier)
  async onAssign(
    @Payload() env: MessageEnvelope<AssignCourierCommand>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await runWithTraceparent(env.traceparent, "dispatch assign_courier", () =>
      this.dispatch.assignCourier(env.messageId, env.data),
    );
    ack(ctx);
  }

  @EventPattern(SagaCommand.UnassignCourier)
  async onUnassign(
    @Payload() env: MessageEnvelope<UnassignCourierCommand>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await runWithTraceparent(env.traceparent, "dispatch unassign_courier", () =>
      this.dispatch.unassignCourier(env.messageId, env.data),
    );
    ack(ctx);
  }
}

function ack(ctx: RmqContext): void {
  const channel = ctx.getChannelRef() as { ack: (msg: unknown) => void };
  channel.ack(ctx.getMessage());
}
