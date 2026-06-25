import { Body, Controller, Post, SerializeOptions } from "@nestjs/common";
import { ApiCreatedResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { RatingsClient } from "../clients/ratings.client";
import { CreateSupportTicketDto, SupportTicketResponseDto } from "./dto/support.dto";
import { toSupportTicketResponseDto } from "./mappers";

@ApiTags("support")
@ApiSecurity("X-User-Id")
@SerializeOptions({ type: SupportTicketResponseDto, excludeExtraneousValues: true })
@Controller({ path: "support", version: "1" })
export class SupportController {
  constructor(private readonly ratingsClient: RatingsClient) {}

  @Post()
  @ApiCreatedResponse({ type: SupportTicketResponseDto })
  async create(
    @CurrentUser() customerId: string,
    @Body() dto: CreateSupportTicketDto,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.ratingsClient.createSupportTicket({
      customerId,
      subject: dto.subject,
      body: dto.body,
    });
    return toSupportTicketResponseDto(ticket);
  }
}
