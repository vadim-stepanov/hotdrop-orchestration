import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

export class DishResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  name!: string;

  @Expose()
  @ApiProperty({ description: "May be empty." })
  description!: string;

  @Expose()
  @ApiProperty({ description: "Price in cents." })
  priceCents!: number;
}

export class DropResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  kitchenId!: string;

  @Expose()
  @ApiProperty({ enum: ["DRAFT", "SCHEDULED", "LIVE", "SOLD_OUT", "CLOSED"] })
  status!: string;

  @Expose()
  @ApiProperty({ description: "Delivery window start (ISO-8601)." })
  windowFrom!: string;

  @Expose()
  @ApiProperty({ description: "Delivery window end (ISO-8601)." })
  windowTo!: string;

  @Expose()
  @ApiProperty()
  totalPortions!: number;

  @Expose()
  @ApiProperty({ description: "Portions still available." })
  available!: number;

  @Expose()
  @ApiProperty({ description: "Price for one portion of the drop, in cents." })
  pricePerPortionCents!: number;

  @Expose()
  @ApiProperty({ type: [DishResponseDto] })
  @Type(() => DishResponseDto)
  dishes!: DishResponseDto[];
}
