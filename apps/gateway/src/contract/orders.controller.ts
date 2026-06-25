import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Post,
  SerializeOptions,
} from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { KitchenClient } from "../clients/kitchen.client";
import { OrderClient } from "../clients/order.client";
import { RatingsClient } from "../clients/ratings.client";
import { CreateRatingDto, RatingResponseDto } from "./dto/rating.dto";
import { OrderResponseDto, PlaceOrderDto, PlaceOrderResponseDto } from "./dto/order.dto";
import { toOrderResponseDto, toRatingResponseDto } from "./mappers";

@ApiTags("orders")
@ApiSecurity("X-User-Id")
@Controller({ path: "orders", version: "1" })
export class OrdersController {
  constructor(
    private readonly kitchen: KitchenClient,
    private readonly order: OrderClient,
    private readonly ratingsClient: RatingsClient,
  ) {}

  // Place: resolve each line's unit price from the kitchen (gRPC), then start the saga.
  @Post()
  @SerializeOptions({ type: PlaceOrderResponseDto, excludeExtraneousValues: true })
  @ApiCreatedResponse({ type: PlaceOrderResponseDto })
  async place(
    @CurrentUser() customerId: string,
    @Body() dto: PlaceOrderDto,
  ): Promise<PlaceOrderResponseDto> {
    const lines = [];
    for (const line of dto.lines) {
      const drop = await this.kitchen.getDrop(line.dropId);
      lines.push({ dropId: line.dropId, qty: line.qty, unitPriceCents: drop.pricePerPortionCents });
    }
    const result = await this.order.placeOrder(customerId, dto.deliveryAddress, lines);
    return { orderId: result.orderId, status: result.status };
  }

  @Get()
  @SerializeOptions({ type: OrderResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: [OrderResponseDto] })
  async list(@CurrentUser() customerId: string): Promise<OrderResponseDto[]> {
    const orders = await this.order.listOrders(customerId);
    return orders.map(toOrderResponseDto);
  }

  @Get(":orderId")
  @SerializeOptions({ type: OrderResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: OrderResponseDto })
  async get(
    @CurrentUser() customerId: string,
    @Param("orderId") orderId: string,
  ): Promise<OrderResponseDto> {
    return toOrderResponseDto(await this.order.getOrder(orderId, customerId));
  }

  @Post(":orderId/cancel")
  @SerializeOptions({ type: OrderResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: OrderResponseDto })
  async cancel(
    @CurrentUser() customerId: string,
    @Param("orderId") orderId: string,
  ): Promise<OrderResponseDto> {
    return toOrderResponseDto(await this.order.cancelOrder(orderId, customerId));
  }

  // Rate a delivered drop: only on a COMPLETED order the caller owns.
  @Post(":orderId/ratings")
  @SerializeOptions({ type: RatingResponseDto, excludeExtraneousValues: true })
  @ApiCreatedResponse({ type: RatingResponseDto })
  async rate(
    @CurrentUser() customerId: string,
    @Param("orderId") orderId: string,
    @Body() dto: CreateRatingDto,
  ): Promise<RatingResponseDto> {
    const order = await this.order.getOrder(orderId, customerId);
    if (order.status !== "COMPLETED") {
      throw new ConflictException("only a completed order can be rated");
    }
    if (!order.lines.some((l) => l.dropId === dto.dropId)) {
      throw new BadRequestException("drop is not part of this order");
    }
    const rating = await this.ratingsClient.createRating({
      orderId,
      dropId: dto.dropId,
      customerId,
      score: dto.score,
      comment: dto.comment ?? "",
    });
    return toRatingResponseDto(rating);
  }
}
