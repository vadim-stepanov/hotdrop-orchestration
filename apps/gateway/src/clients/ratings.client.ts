import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { fromGrpc } from "./grpc-error";
import { GrpcRating, GrpcSupportTicket, RatingsQueryGrpc } from "./grpc.types";
import { RATINGS_GRPC } from "./tokens";

@Injectable()
export class RatingsClient implements OnModuleInit {
  private ratings!: RatingsQueryGrpc;

  constructor(@Inject(RATINGS_GRPC) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.ratings = this.client.getService<RatingsQueryGrpc>("RatingsQuery");
  }

  createRating(input: {
    orderId: string;
    dropId: string;
    customerId: string;
    score: number;
    comment: string;
  }): Promise<GrpcRating> {
    return fromGrpc(this.ratings.CreateRating(input));
  }

  async listRatings(dropId: string): Promise<GrpcRating[]> {
    const result = await fromGrpc(this.ratings.ListRatings({ dropId }));
    return result.ratings ?? [];
  }

  createSupportTicket(input: {
    customerId: string;
    subject: string;
    body: string;
  }): Promise<GrpcSupportTicket> {
    return fromGrpc(this.ratings.CreateSupportTicket(input));
  }
}
