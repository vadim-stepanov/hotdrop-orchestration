import { Module } from "@nestjs/common";
import { ClientsModule, GrpcOptions, Transport } from "@nestjs/microservices";
import { AppConfigService } from "../config/config.service";
import { KitchenClient } from "./kitchen.client";
import { OrderClient } from "./order.client";
import { RatingsClient } from "./ratings.client";
import { KITCHEN_GRPC, ORDER_GRPC, RATINGS_GRPC } from "./tokens";

function grpcOptions(url: string): GrpcOptions {
  return {
    transport: Transport.GRPC,
    options: {
      package: "hotdrop",
      protoPath: require.resolve("@hotdrop/contracts/proto"),
      url,
      loader: { keepCase: true },
    },
  };
}

// gRPC clients the gateway composes over. payment/dispatch are not here —
// they are reached only via the saga (RabbitMQ), never read directly by the edge.
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KITCHEN_GRPC,
        inject: [AppConfigService],
        useFactory: (config: AppConfigService) => grpcOptions(config.kitchenGrpcUrl),
      },
      {
        name: ORDER_GRPC,
        inject: [AppConfigService],
        useFactory: (config: AppConfigService) => grpcOptions(config.orderGrpcUrl),
      },
      {
        name: RATINGS_GRPC,
        inject: [AppConfigService],
        useFactory: (config: AppConfigService) => grpcOptions(config.ratingsGrpcUrl),
      },
    ]),
  ],
  providers: [KitchenClient, OrderClient, RatingsClient],
  exports: [KitchenClient, OrderClient, RatingsClient],
})
export class ClientsGrpcModule {}
