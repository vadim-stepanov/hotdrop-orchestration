import { Injectable } from "@nestjs/common";

export interface HealthStatus {
  status: "ok";
  uptime: number;
}

// Liveness probe. A database connectivity check is added when Prisma lands in services
// that own a database.
@Injectable()
export class HealthService {
  check(): HealthStatus {
    return { status: "ok", uptime: Math.floor(process.uptime()) };
  }
}
