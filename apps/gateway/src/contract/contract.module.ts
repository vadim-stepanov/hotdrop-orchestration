import { Module } from "@nestjs/common";
import { ClientsGrpcModule } from "../clients/clients.module";
import { DropsController } from "./drops.controller";
import { OrdersController } from "./orders.controller";
import { SupportController } from "./support.controller";

// The public contract surface: REST controllers composing the downstream services over
// gRPC. This is what this project freezes (openapi.json).
@Module({
  imports: [ClientsGrpcModule],
  controllers: [DropsController, OrdersController, SupportController],
})
export class ContractModule {}
