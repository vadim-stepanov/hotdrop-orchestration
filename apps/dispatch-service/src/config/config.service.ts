import { Injectable } from "@nestjs/common";
import { Env, validateEnv } from "./env.schema";

@Injectable()
export class AppConfigService {
  readonly env: Env;

  constructor() {
    this.env = validateEnv(process.env);
  }

  get port(): number {
    return this.env.DISPATCH_PORT;
  }

  get databaseUrl(): string {
    return this.env.DISPATCH_DATABASE_URL;
  }

  get rabbitmqUrl(): string {
    return this.env.RABBITMQ_URL;
  }

  get courierDeclineRate(): number {
    return this.env.COURIER_DECLINE_RATE;
  }

  get courierLatencyMs(): number {
    return this.env.COURIER_LATENCY_MS;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === "production";
  }
}
