import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
import { HealthModule } from "./health/health.module";
import { MessagingModule } from "./messaging/messaging.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RatingsModule } from "./ratings/ratings.module";

@Module({
  imports: [ConfigModule, PrismaModule, MessagingModule, RatingsModule, HealthModule],
})
export class AppModule {}
