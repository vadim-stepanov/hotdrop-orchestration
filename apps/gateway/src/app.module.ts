import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
import { ContractModule } from "./contract/contract.module";
import { HealthModule } from "./health/health.module";
import { TrackingModule } from "./tracking/tracking.module";

@Module({
  imports: [ConfigModule, ContractModule, TrackingModule, HealthModule],
})
export class AppModule {}
