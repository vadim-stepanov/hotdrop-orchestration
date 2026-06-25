import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import type { OrderStatusChangedEvent } from "@hotdrop/contracts";

// Real-time order tracking. A client connects and subscribes to an order;
// the gateway pushes each saga status change (fed by the RMQ StatusConsumer) to that room.
@WebSocketGateway({ cors: { origin: "*" } })
export class TrackingGateway {
  @WebSocketServer() private readonly server!: Server;

  // socket.emit("track", { orderId }) → join the order's room.
  @SubscribeMessage("track")
  track(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { orderId: string },
  ): { tracking: string } {
    void client.join(`order:${body.orderId}`);
    return { tracking: body.orderId };
  }

  emitStatus(event: OrderStatusChangedEvent): void {
    this.server.to(`order:${event.orderId}`).emit("status", {
      orderId: event.orderId,
      status: event.status,
    });
  }
}
