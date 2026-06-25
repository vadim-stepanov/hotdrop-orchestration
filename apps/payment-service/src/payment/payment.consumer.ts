import { Controller } from "@nestjs/common";
import { Ctx, EventPattern, Payload } from "@nestjs/microservices";
import { SagaCommand } from "@hotdrop/contracts";
import { runWithTraceparent } from "@hotdrop/telemetry";
import type {
  AuthorizePaymentCommand,
  CapturePaymentCommand,
  RefundPaymentCommand,
  VoidPaymentCommand,
} from "@hotdrop/contracts";
import type { MessageEnvelope } from "@hotdrop/messaging";
import type { RmqContext } from "@nestjs/microservices";
import { PaymentService } from "./payment.service";

@Controller()
export class PaymentConsumer {
  constructor(private readonly payment: PaymentService) {}

  @EventPattern(SagaCommand.AuthorizePayment)
  async onAuthorize(
    @Payload() env: MessageEnvelope<AuthorizePaymentCommand>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await runWithTraceparent(env.traceparent, "payment authorize", () =>
      this.payment.authorize(env.messageId, env.data),
    );
    ack(ctx);
  }

  @EventPattern(SagaCommand.CapturePayment)
  async onCapture(
    @Payload() env: MessageEnvelope<CapturePaymentCommand>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await runWithTraceparent(env.traceparent, "payment capture", () =>
      this.payment.capture(env.messageId, env.data),
    );
    ack(ctx);
  }

  @EventPattern(SagaCommand.VoidPayment)
  async onVoid(
    @Payload() env: MessageEnvelope<VoidPaymentCommand>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await runWithTraceparent(env.traceparent, "payment void", () =>
      this.payment.voidPayment(env.messageId, env.data),
    );
    ack(ctx);
  }

  @EventPattern(SagaCommand.RefundPayment)
  async onRefund(
    @Payload() env: MessageEnvelope<RefundPaymentCommand>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await runWithTraceparent(env.traceparent, "payment refund", () =>
      this.payment.refund(env.messageId, env.data),
    );
    ack(ctx);
  }
}

function ack(ctx: RmqContext): void {
  const channel = ctx.getChannelRef() as { ack: (msg: unknown) => void };
  channel.ack(ctx.getMessage());
}
