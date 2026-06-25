import { Injectable } from "@nestjs/common";
import { Env, validateEnv } from "./env.schema";

@Injectable()
export class AppConfigService {
  readonly env: Env;

  constructor() {
    this.env = validateEnv(process.env);
  }

  get port(): number {
    return this.env.NOTIFICATIONS_PORT;
  }

  get rabbitmqUrl(): string {
    return this.env.RABBITMQ_URL;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === "production";
  }
}
