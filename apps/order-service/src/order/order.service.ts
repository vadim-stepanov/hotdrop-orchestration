import { Injectable } from "@nestjs/common";
import { ReservePortionsCommand, SagaCommand } from "@hotdrop/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { PlaceOrderInput } from "./place-order.input";
import { sagaOutbox } from "./saga-outbox";

export interface OrderView {
  id: string;
  customerId: string;
  status: string;
  deliveryAddress: string;
  totalCents: number;
  lines: { dropId: string; qty: number; unitPriceCents: number }[];
}

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  // Place an order and start the saga: create the order + lines + saga instance, and emit
  // the first command (ReservePortions) to the outbox — all in one local transaction.
  async placeOrder(input: PlaceOrderInput): Promise<{ orderId: string }> {
    const totalCents = input.lines.reduce((sum, l) => sum + l.qty * l.unitPriceCents, 0);

    const orderId = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: input.customerId,
          deliveryAddress: input.deliveryAddress,
          totalCents,
          status: "PLACED",
          lines: {
            create: input.lines.map((l) => ({
              dropId: l.dropId,
              qty: l.qty,
              unitPriceCents: l.unitPriceCents,
            })),
          },
        },
      });
      await tx.sagaInstance.create({ data: { orderId: order.id, step: "ReservePortions" } });
      const command: ReservePortionsCommand = {
        orderId: order.id,
        lines: input.lines.map((l) => ({ dropId: l.dropId, qty: l.qty })),
      };
      await tx.outboxMessage.create({ data: sagaOutbox(SagaCommand.ReservePortions, command) });
      return order.id;
    });

    return { orderId };
  }

  async getOrder(orderId: string): Promise<OrderView | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });
    return order ? this.toView(order) : null;
  }

  async listOrders(customerId: string): Promise<OrderView[]> {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    });
    return orders.map((o) => this.toView(o));
  }

  private toView(order: {
    id: string;
    customerId: string;
    status: string;
    deliveryAddress: string;
    totalCents: number;
    lines: { dropId: string; qty: number; unitPriceCents: number }[];
  }): OrderView {
    return {
      id: order.id,
      customerId: order.customerId,
      status: order.status,
      deliveryAddress: order.deliveryAddress,
      totalCents: order.totalCents,
      lines: order.lines.map((l) => ({
        dropId: l.dropId,
        qty: l.qty,
        unitPriceCents: l.unitPriceCents,
      })),
    };
  }
}
