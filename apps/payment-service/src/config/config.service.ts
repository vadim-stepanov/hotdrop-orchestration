import { Injectable } from "@nestjs/common";
import { Env, validateEnv } from "./env.schema";

@Injectable()
export class AppConfigService {
  readonly env: Env;

  constructor() {
    this.env = validateEnv(process.env);
  }

  get port(): number {
    return this.env.PAYMENT_PORT;
  }

  get databaseUrl(): string {
    return this.env.PAYMENT_DATABASE_URL;
  }

  get rabbitmqUrl(): string {
    return this.env.RABBITMQ_URL;
  }

  get paymentFailureRate(): number {
    return this.env.PAYMENT_FAILURE_RATE;
  }

  get paymentLatencyMs(): number {
    return this.env.PAYMENT_LATENCY_MS;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === "production";
  }
}
