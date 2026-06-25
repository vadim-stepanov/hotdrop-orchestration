import { Module } from "@nestjs/common";
import { OrderQueryController } from "./order-query.controller";
import { OrderConsumer } from "./order.consumer";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { SagaOrchestrator } from "./orchestrator.service";

@Module({
  controllers: [OrderController, OrderConsumer, OrderQueryController],
  providers: [OrderService, SagaOrchestrator],
})
export class OrderModule {}
