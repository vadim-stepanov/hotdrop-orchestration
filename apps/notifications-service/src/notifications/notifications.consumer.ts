import { Controller, Logger } from "@nestjs/common";
import { Ctx, EventPattern, Payload } from "@nestjs/microservices";
import { OrderEvent, SUPPORT_TICKET_CREATED } from "@hotdrop/contracts";
import { runWithTraceparent } from "@hotdrop/telemetry";
import type {
  OrderCancelledEvent,
  OrderCompletedEvent,
  OrderConfirmedEvent,
  OrderRejectedEvent,
  SupportTicketCreatedEvent,
} from "@hotdrop/contracts";
import type { MessageEnvelope } from "@hotdrop/messaging";
import type { RmqContext } from "@nestjs/microservices";

// Emulated notification delivery: logs the reaction under the originating trace and acks.
// Duplicate deliveries are harmless here (a log line), so notifications has no DB/inbox.
@Controller()
export class NotificationsConsumer {
  private readonly logger = new Logger(NotificationsConsumer.name);

  @EventPattern(OrderEvent.Confirmed)
  async onConfirmed(
    @Payload() env: MessageEnvelope<OrderConfirmedEvent>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await this.notify(env, "notify order_confirmed", `order ${env.data.orderId}: confirmed → notify customer ${env.data.customerId}`);
    ack(ctx);
  }

  @EventPattern(OrderEvent.Completed)
  async onCompleted(
    @Payload() env: MessageEnvelope<OrderCompletedEvent>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await this.notify(env, "notify order_completed", `order ${env.data.orderId}: delivered → notify customer ${env.data.customerId}`);
    ack(ctx);
  }

  @EventPattern(OrderEvent.Cancelled)
  async onCancelled(
    @Payload() env: MessageEnvelope<OrderCancelledEvent>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await this.notify(env, "notify order_cancelled", `order ${env.data.orderId}: cancelled (${env.data.reason}) → notify ${env.data.customerId}`);
    ack(ctx);
  }

  @EventPattern(OrderEvent.Rejected)
  async onRejected(
    @Payload() env: MessageEnvelope<OrderRejectedEvent>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await this.notify(env, "notify order_rejected", `order ${env.data.orderId}: rejected (${env.data.reason}) → notify ${env.data.customerId}`);
    ack(ctx);
  }

  @EventPattern(SUPPORT_TICKET_CREATED)
  async onSupportTicket(
    @Payload() env: MessageEnvelope<SupportTicketCreatedEvent>,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    await this.notify(env, "notify support_ticket", `support ticket ${env.data.ticketId} from ${env.data.customerId}: "${env.data.subject}"`);
    ack(ctx);
  }

  private notify(env: MessageEnvelope<unknown>, label: string, message: string): Promise<void> {
    return runWithTraceparent(env.traceparent, label, () => {
      this.logger.log(message);
      return Promise.resolve();
    });
  }
}

function ack(ctx: RmqContext): void {
  const channel = ctx.getChannelRef() as { ack: (msg: unknown) => void };
  channel.ack(ctx.getMessage());
}
