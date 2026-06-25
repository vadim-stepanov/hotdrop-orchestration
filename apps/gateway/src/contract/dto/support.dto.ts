import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString, Length } from "class-validator";

export class CreateSupportTicketDto {
  @ApiProperty()
  @IsString()
  @Length(1, 120)
  subject!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 2000)
  body!: string;
}

export class SupportTicketResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  customerId!: string;

  @Expose()
  @ApiProperty()
  subject!: string;

  @Expose()
  @ApiProperty({ description: "ISO-8601." })
  createdAt!: string;
}
