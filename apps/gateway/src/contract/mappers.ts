import { GrpcDrop, GrpcOrder, GrpcRating, GrpcSupportTicket } from "../clients/grpc.types";
import { DropResponseDto } from "./dto/drop.dto";
import { OrderResponseDto } from "./dto/order.dto";
import { RatingResponseDto } from "./dto/rating.dto";
import { SupportTicketResponseDto } from "./dto/support.dto";

export function toDropResponseDto(d: GrpcDrop): DropResponseDto {
  return {
    id: d.id,
    kitchenId: d.kitchenId,
    status: d.status,
    windowFrom: d.windowFrom,
    windowTo: d.windowTo,
    totalPortions: d.totalPortions,
    available: d.available,
    pricePerPortionCents: d.pricePerPortionCents,
    dishes: (d.dishes ?? []).map((dish) => ({
      id: dish.id,
      name: dish.name,
      description: dish.description,
      priceCents: dish.priceCents,
    })),
  };
}

export function toOrderResponseDto(o: GrpcOrder): OrderResponseDto {
  return {
    id: o.id,
    customerId: o.customerId,
    status: o.status,
    deliveryAddress: o.deliveryAddress,
    totalCents: o.totalCents,
    lines: (o.lines ?? []).map((l) => ({
      dropId: l.dropId,
      qty: l.qty,
      unitPriceCents: l.unitPriceCents,
    })),
  };
}

export function toRatingResponseDto(r: GrpcRating): RatingResponseDto {
  return {
    id: r.id,
    dropId: r.dropId,
    customerId: r.customerId,
    score: r.score,
    comment: r.comment,
    createdAt: r.createdAt,
  };
}

export function toSupportTicketResponseDto(t: GrpcSupportTicket): SupportTicketResponseDto {
  return { id: t.id, customerId: t.customerId, subject: t.subject, createdAt: t.createdAt };
}
