import { Module } from "@nestjs/common";
import { DispatchConsumer } from "./dispatch.consumer";
import { DispatchService } from "./dispatch.service";

@Module({
  controllers: [DispatchConsumer],
  providers: [DispatchService],
})
export class DispatchModule {}
