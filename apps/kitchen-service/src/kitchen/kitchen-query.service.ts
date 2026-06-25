import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// gRPC message shapes (proto hotdrop.KitchenQuery), camelCase to match keepCase loader.
export interface ProtoDish {
  id: string;
  name: string;
  description: string;
  priceCents: number;
}
export interface ProtoDrop {
  id: string;
  kitchenId: string;
  status: string;
  windowFrom: string;
  windowTo: string;
  totalPortions: number;
  available: number;
  pricePerPortionCents: number;
  dishes: ProtoDish[];
}

type DropWithDishes = {
  id: string;
  kitchenId: string;
  status: string;
  windowFrom: Date;
  windowTo: Date;
  totalPortions: number;
  available: number;
  dishes: { id: string; name: string; description: string | null; priceCents: number }[];
};

@Injectable()
export class KitchenQueryService {
  constructor(private readonly prisma: PrismaService) {}

  // Browse: defaults to LIVE drops (the marketplace shelf); an explicit status overrides.
  async listDrops(status?: string): Promise<ProtoDrop[]> {
    const drops = await this.prisma.drop.findMany({
      where: { status: (status && status.length > 0 ? status : "LIVE") as never },
      include: { dishes: true },
      orderBy: { windowFrom: "asc" },
    });
    return drops.map((d) => this.toProto(d));
  }

  async getDrop(dropId: string): Promise<ProtoDrop | null> {
    const drop = await this.prisma.drop.findUnique({
      where: { id: dropId },
      include: { dishes: true },
    });
    return drop ? this.toProto(drop) : null;
  }

  private toProto(drop: DropWithDishes): ProtoDrop {
    const dishes: ProtoDish[] = drop.dishes.map((dish) => ({
      id: dish.id,
      name: dish.name,
      description: dish.description ?? "",
      priceCents: dish.priceCents,
    }));
    return {
      id: drop.id,
      kitchenId: drop.kitchenId,
      status: drop.status,
      windowFrom: drop.windowFrom.toISOString(),
      windowTo: drop.windowTo.toISOString(),
      totalPortions: drop.totalPortions,
      available: drop.available,
      // A portion of the drop = one of each of its dishes; price is their sum.
      pricePerPortionCents: dishes.reduce((sum, dish) => sum + dish.priceCents, 0),
      dishes,
    };
  }
}
