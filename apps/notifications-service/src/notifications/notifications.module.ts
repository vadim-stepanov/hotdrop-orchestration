import { Module } from "@nestjs/common";
import { NotificationsConsumer } from "./notifications.consumer";

@Module({
  controllers: [NotificationsConsumer],
})
export class NotificationsModule {}
