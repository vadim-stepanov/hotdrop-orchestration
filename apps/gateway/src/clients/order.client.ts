import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { fromGrpc } from "./grpc-error";
import { GrpcOrder, GrpcOrderLine, OrderQueryGrpc } from "./grpc.types";
import { ORDER_GRPC } from "./tokens";

@Injectable()
export class OrderClient implements OnModuleInit {
  private order!: OrderQueryGrpc;

  constructor(@Inject(ORDER_GRPC) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.order = this.client.getService<OrderQueryGrpc>("OrderQuery");
  }

  placeOrder(
    customerId: string,
    deliveryAddress: string,
    lines: GrpcOrderLine[],
  ): Promise<{ orderId: string; status: string }> {
    return fromGrpc(this.order.PlaceOrder({ customerId, deliveryAddress, lines }));
  }

  getOrder(orderId: string, customerId: string): Promise<GrpcOrder> {
    return fromGrpc(this.order.GetOrder({ orderId, customerId }));
  }

  async listOrders(customerId: string): Promise<GrpcOrder[]> {
    const result = await fromGrpc(this.order.ListOrders({ customerId }));
    return result.orders ?? [];
  }

  cancelOrder(orderId: string, customerId: string): Promise<GrpcOrder> {
    return fromGrpc(this.order.CancelOrder({ orderId, customerId }));
  }
}
