import { Module } from "@nestjs/common";
import { RatingsQueryController } from "./ratings-query.controller";
import { RatingsService } from "./ratings.service";

@Module({
  controllers: [RatingsQueryController],
  providers: [RatingsService],
})
export class RatingsModule {}
