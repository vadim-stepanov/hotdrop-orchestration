import { Module } from "@nestjs/common";
import { PaymentConsumer } from "./payment.consumer";
import { PaymentService } from "./payment.service";

@Module({
  controllers: [PaymentConsumer],
  providers: [PaymentService],
})
export class PaymentModule {}
