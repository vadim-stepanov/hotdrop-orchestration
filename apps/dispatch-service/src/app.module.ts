import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
import { DispatchModule } from "./dispatch/dispatch.module";
import { HealthModule } from "./health/health.module";
import { MessagingModule } from "./messaging/messaging.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [ConfigModule, PrismaModule, MessagingModule, DispatchModule, HealthModule],
})
export class AppModule {}
