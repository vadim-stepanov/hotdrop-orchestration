import { Controller } from "@nestjs/common";
import { GrpcMethod, RpcException } from "@nestjs/microservices";
import { status as GrpcStatus } from "@grpc/grpc-js";
import { KitchenQueryService, ProtoDrop } from "./kitchen-query.service";

// gRPC server for the gateway's drop reads (proto service KitchenQuery).
@Controller()
export class KitchenQueryController {
  constructor(private readonly query: KitchenQueryService) {}

  @GrpcMethod("KitchenQuery", "ListDrops")
  async listDrops(request: { status?: string }): Promise<{ drops: ProtoDrop[] }> {
    return { drops: await this.query.listDrops(request.status) };
  }

  @GrpcMethod("KitchenQuery", "GetDrop")
  async getDrop(request: { dropId: string }): Promise<ProtoDrop> {
    const drop = await this.query.getDrop(request.dropId);
    if (!drop) {
      throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: `drop ${request.dropId} not found` });
    }
    return drop;
  }
}
