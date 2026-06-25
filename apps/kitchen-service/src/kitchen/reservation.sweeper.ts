import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { KitchenService } from "./kitchen.service";

const SWEEP_INTERVAL_MS = 15_000;

// Periodically releases portions held by reservations whose TTL lapsed —
// the background counterpart to the saga's explicit compensations. Native setInterval, no dep.
@Injectable()
export class ReservationSweeper implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ReservationSweeper.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly kitchen: KitchenService) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async sweep(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const released = await this.kitchen.releaseExpiredReservations();
      if (released > 0) {
        this.logger.log(`released ${released} expired reservation(s)`);
      }
    } catch (error) {
      this.logger.error(
        "reservation sweep failed",
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
