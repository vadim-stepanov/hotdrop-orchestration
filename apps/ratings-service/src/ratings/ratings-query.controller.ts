import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { ProtoRating, ProtoSupportTicket, RatingsService } from "./ratings.service";

// gRPC server for the gateway's ratings + support calls (proto service RatingsQuery).
@Controller()
export class RatingsQueryController {
  constructor(private readonly ratings: RatingsService) {}

  @GrpcMethod("RatingsQuery", "CreateRating")
  createRating(request: {
    orderId: string;
    dropId: string;
    customerId: string;
    score: number;
    comment: string;
  }): Promise<ProtoRating> {
    return this.ratings.createRating(request);
  }

  @GrpcMethod("RatingsQuery", "ListRatings")
  async listRatings(request: { dropId: string }): Promise<{ ratings: ProtoRating[] }> {
    return { ratings: await this.ratings.listRatings(request.dropId) };
  }

  @GrpcMethod("RatingsQuery", "CreateSupportTicket")
  createSupportTicket(request: {
    customerId: string;
    subject: string;
    body: string;
  }): Promise<ProtoSupportTicket> {
    return this.ratings.createSupportTicket(request);
  }
}
