import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class CreateRatingDto {
  @ApiProperty({ description: "Drop being rated (must belong to the order)." })
  @IsString()
  @Length(1, 60)
  dropId!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  comment?: string;
}

export class RatingResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  dropId!: string;

  @Expose()
  @ApiProperty()
  customerId!: string;

  @Expose()
  @ApiProperty({ minimum: 1, maximum: 5 })
  score!: number;

  @Expose()
  @ApiProperty({ description: "May be empty." })
  comment!: string;

  @Expose()
  @ApiProperty({ description: "ISO-8601." })
  createdAt!: string;
}
