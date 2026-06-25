import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { fromGrpc } from "./grpc-error";
import { GrpcDrop, KitchenQueryGrpc } from "./grpc.types";
import { KITCHEN_GRPC } from "./tokens";

@Injectable()
export class KitchenClient implements OnModuleInit {
  private kitchen!: KitchenQueryGrpc;

  constructor(@Inject(KITCHEN_GRPC) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.kitchen = this.client.getService<KitchenQueryGrpc>("KitchenQuery");
  }

  async listDrops(status = ""): Promise<GrpcDrop[]> {
    const result = await fromGrpc(this.kitchen.ListDrops({ status }));
    return result.drops ?? [];
  }

  getDrop(dropId: string): Promise<GrpcDrop> {
    return fromGrpc(this.kitchen.GetDrop({ dropId }));
  }
}
