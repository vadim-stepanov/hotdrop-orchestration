import type { Observable } from "rxjs";

// gRPC message shapes (proto hotdrop.*, camelCase to match the keepCase loader).
export interface GrpcDish {
  id: string;
  name: string;
  description: string;
  priceCents: number;
}
export interface GrpcDrop {
  id: string;
  kitchenId: string;
  status: string;
  windowFrom: string;
  windowTo: string;
  totalPortions: number;
  available: number;
  pricePerPortionCents: number;
  dishes: GrpcDish[];
}
export interface GrpcOrderLine {
  dropId: string;
  qty: number;
  unitPriceCents: number;
}
export interface GrpcOrder {
  id: string;
  customerId: string;
  status: string;
  deliveryAddress: string;
  totalCents: number;
  lines: GrpcOrderLine[];
}
export interface GrpcRating {
  id: string;
  dropId: string;
  customerId: string;
  score: number;
  comment: string;
  createdAt: string;
}
export interface GrpcSupportTicket {
  id: string;
  customerId: string;
  subject: string;
  createdAt: string;
}

export interface KitchenQueryGrpc {
  ListDrops(req: { status: string }): Observable<{ drops?: GrpcDrop[] }>;
  GetDrop(req: { dropId: string }): Observable<GrpcDrop>;
}
export interface OrderQueryGrpc {
  PlaceOrder(req: {
    customerId: string;
    deliveryAddress: string;
    lines: GrpcOrderLine[];
  }): Observable<{ orderId: string; status: string }>;
  GetOrder(req: { orderId: string; customerId: string }): Observable<GrpcOrder>;
  ListOrders(req: { customerId: string }): Observable<{ orders?: GrpcOrder[] }>;
  CancelOrder(req: { orderId: string; customerId: string }): Observable<GrpcOrder>;
}
export interface RatingsQueryGrpc {
  CreateRating(req: {
    orderId: string;
    dropId: string;
    customerId: string;
    score: number;
    comment: string;
  }): Observable<GrpcRating>;
  ListRatings(req: { dropId: string }): Observable<{ ratings?: GrpcRating[] }>;
  CreateSupportTicket(req: {
    customerId: string;
    subject: string;
    body: string;
  }): Observable<GrpcSupportTicket>;
}
