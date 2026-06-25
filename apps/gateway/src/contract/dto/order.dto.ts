import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsString, Length, Min, ValidateNested } from "class-validator";

export class PlaceOrderLineDto {
  @ApiProperty()
  @IsString()
  @Length(1, 60)
  dropId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  qty!: number;
}

export class PlaceOrderDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  deliveryAddress!: string;

  @ApiProperty({ type: [PlaceOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PlaceOrderLineDto)
  lines!: PlaceOrderLineDto[];
}

export class OrderLineResponseDto {
  @Expose()
  @ApiProperty()
  dropId!: string;

  @Expose()
  @ApiProperty()
  qty!: number;

  @Expose()
  @ApiProperty({ description: "Resolved unit price in cents." })
  unitPriceCents!: number;
}

export class OrderResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  customerId!: string;

  @Expose()
  @ApiProperty({
    enum: [
      "PLACED",
      "PORTIONS_RESERVED",
      "PAYMENT_AUTHORIZED",
      "ACCEPTED",
      "PREPARING",
      "READY",
      "COURIER_ASSIGNED",
      "PICKED_UP",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
    ],
  })
  status!: string;

  @Expose()
  @ApiProperty()
  deliveryAddress!: string;

  @Expose()
  @ApiProperty({ description: "Order total in cents." })
  totalCents!: number;

  @Expose()
  @ApiProperty({ type: [OrderLineResponseDto] })
  @Type(() => OrderLineResponseDto)
  lines!: OrderLineResponseDto[];
}

export class PlaceOrderResponseDto {
  @Expose()
  @ApiProperty()
  orderId!: string;

  @Expose()
  @ApiProperty()
  status!: string;
}
