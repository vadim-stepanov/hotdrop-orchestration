import { Injectable } from "@nestjs/common";
import { Env, validateEnv } from "./env.schema";

@Injectable()
export class AppConfigService {
  readonly env: Env;

  constructor() {
    this.env = validateEnv(process.env);
  }

  get port(): number {
    return this.env.GATEWAY_PORT;
  }

  get orderGrpcUrl(): string {
    return this.env.ORDER_GRPC_URL;
  }

  get kitchenGrpcUrl(): string {
    return this.env.KITCHEN_GRPC_URL;
  }

  get ratingsGrpcUrl(): string {
    return this.env.RATINGS_GRPC_URL;
  }

  get rabbitmqUrl(): string {
    return this.env.RABBITMQ_URL;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === "production";
  }
}
