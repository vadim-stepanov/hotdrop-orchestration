import { Module } from "@nestjs/common";
import { KitchenQueryController } from "./kitchen-query.controller";
import { KitchenQueryService } from "./kitchen-query.service";
import { KitchenConsumer } from "./kitchen.consumer";
import { KitchenService } from "./kitchen.service";
import { ReservationSweeper } from "./reservation.sweeper";

@Module({
  controllers: [KitchenConsumer, KitchenQueryController],
  providers: [KitchenService, KitchenQueryService, ReservationSweeper],
})
export class KitchenModule {}
