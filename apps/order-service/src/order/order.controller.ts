import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { OrderService } from "./order.service";
import type { OrderView } from "./order.service";
import type { PlaceOrderInput } from "./place-order.input";

// Internal HTTP surface for the order aggregate — NOT the public contract (the gateway is
// the only public edge; it fronts these over gRPC in the contract step). Used to start
// and inspect sagas in development/tests.
@ApiTags("orders (internal)")
@Controller({ path: "orders", version: "1" })
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Post()
  place(@Body() body: PlaceOrderInput): Promise<{ orderId: string }> {
    return this.orders.placeOrder(body);
  }

  @Get(":orderId")
  async get(@Param("orderId") orderId: string): Promise<OrderView> {
    const order = await this.orders.getOrder(orderId);
    if (!order) {
      throw new NotFoundException(`order ${orderId} not found`);
    }
    return order;
  }
}
