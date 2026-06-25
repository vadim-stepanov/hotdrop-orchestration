import { Module } from "@nestjs/common";
import { StatusConsumer } from "./status.consumer";
import { TrackingGateway } from "./tracking.gateway";

@Module({
  controllers: [StatusConsumer],
  providers: [TrackingGateway],
})
export class TrackingModule {}
