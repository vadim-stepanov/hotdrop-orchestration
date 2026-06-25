import { Injectable } from "@nestjs/common";
import { Env, validateEnv } from "./env.schema";

@Injectable()
export class AppConfigService {
  readonly env: Env;

  constructor() {
    this.env = validateEnv(process.env);
  }

  get port(): number {
    return this.env.RATINGS_PORT;
  }

  get databaseUrl(): string {
    return this.env.RATINGS_DATABASE_URL;
  }

  get rabbitmqUrl(): string {
    return this.env.RABBITMQ_URL;
  }

  get grpcUrl(): string {
    return this.env.RATINGS_GRPC_URL;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === "production";
  }
}
