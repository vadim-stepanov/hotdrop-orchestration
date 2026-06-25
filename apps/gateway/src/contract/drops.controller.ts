import { Controller, Get, Param, SerializeOptions } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { KitchenClient } from "../clients/kitchen.client";
import { RatingsClient } from "../clients/ratings.client";
import { DropResponseDto } from "./dto/drop.dto";
import { RatingResponseDto } from "./dto/rating.dto";
import { toDropResponseDto, toRatingResponseDto } from "./mappers";

@ApiTags("drops")
@Controller({ path: "drops", version: "1" })
export class DropsController {
  constructor(
    private readonly kitchen: KitchenClient,
    private readonly ratingsClient: RatingsClient,
  ) {}

  @Get()
  @SerializeOptions({ type: DropResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: [DropResponseDto], description: "Live drops on the shelf." })
  async list(): Promise<DropResponseDto[]> {
    const drops = await this.kitchen.listDrops("LIVE");
    return drops.map(toDropResponseDto);
  }

  @Get(":dropId")
  @SerializeOptions({ type: DropResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: DropResponseDto })
  async detail(@Param("dropId") dropId: string): Promise<DropResponseDto> {
    return toDropResponseDto(await this.kitchen.getDrop(dropId));
  }

  @Get(":dropId/ratings")
  @SerializeOptions({ type: RatingResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: [RatingResponseDto] })
  async ratings(@Param("dropId") dropId: string): Promise<RatingResponseDto[]> {
    const ratings = await this.ratingsClient.listRatings(dropId);
    return ratings.map(toRatingResponseDto);
  }
}
