import { Controller } from "@nestjs/common";
import { GrpcMethod, RpcException } from "@nestjs/microservices";
import { status as GrpcStatus } from "@grpc/grpc-js";
import { OrderService, OrderView } from "./order.service";
import { SagaOrchestrator } from "./orchestrator.service";
import type { PlaceOrderInput } from "./place-order.input";

// gRPC server for the gateway's order command/query calls (proto service OrderQuery).
@Controller()
export class OrderQueryController {
  constructor(
    private readonly orders: OrderService,
    private readonly orchestrator: SagaOrchestrator,
  ) {}

  @GrpcMethod("OrderQuery", "PlaceOrder")
  async placeOrder(request: PlaceOrderInput): Promise<{ orderId: string; status: string }> {
    const { orderId } = await this.orders.placeOrder(request);
    return { orderId, status: "PLACED" };
  }

  @GrpcMethod("OrderQuery", "GetOrder")
  async getOrder(request: { orderId: string; customerId: string }): Promise<OrderView> {
    const order = await this.orders.getOrder(request.orderId);
    if (!order || order.customerId !== request.customerId) {
      throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: `order ${request.orderId} not found` });
    }
    return order;
  }

  @GrpcMethod("OrderQuery", "ListOrders")
  async listOrders(request: { customerId: string }): Promise<{ orders: OrderView[] }> {
    return { orders: await this.orders.listOrders(request.customerId) };
  }

  @GrpcMethod("OrderQuery", "CancelOrder")
  async cancelOrder(request: { orderId: string; customerId: string }): Promise<OrderView> {
    await this.orchestrator.cancelOrder(request.orderId, request.customerId);
    const order = await this.orders.getOrder(request.orderId);
    if (!order) {
      throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: `order ${request.orderId} not found` });
    }
    return order;
  }
}
