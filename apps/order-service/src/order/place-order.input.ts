// Internal place-order input. The gateway resolves drop unit prices (kitchen) before
// calling order; order computes the total and starts the saga.
export interface PlaceOrderLine {
  dropId: string;
  qty: number;
  unitPriceCents: number;
}

export interface PlaceOrderInput {
  customerId: string;
  deliveryAddress: string;
  lines: PlaceOrderLine[];
}
