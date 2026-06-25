import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Stable demo data for the kitchen catalog (browse + ordering). Idempotent: seed = reset.
// Run via `pnpm --filter @hotdrop/kitchen-service db:seed`. Other services start empty —
// their rows are created by the saga as orders flow.
try {
  process.loadEnvFile(resolve(process.cwd(), "..", "..", ".env"));
} catch {
  // ambient env (CI/container)
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.KITCHEN_DATABASE_URL }),
});

const HOUR = 60 * 60 * 1000;

async function main(): Promise<void> {
  await prisma.reservationItem.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.drop.deleteMany();
  await prisma.kitchen.deleteMany();

  const now = Date.now();
  const windowFrom = new Date(now - HOUR);
  const windowTo = new Date(now + 3 * HOUR);

  await prisma.kitchen.create({ data: { id: "k-ramen-lab", name: "Ramen Lab" } });
  await prisma.kitchen.create({ data: { id: "k-taco-cartel", name: "Taco Cartel" } });

  await prisma.drop.create({
    data: {
      id: "drop-tonkotsu",
      kitchenId: "k-ramen-lab",
      status: "LIVE",
      windowFrom,
      windowTo,
      totalPortions: 20,
      available: 20,
      reserved: 0,
      dishes: {
        create: [
          { id: "dish-tonkotsu", name: "Tonkotsu Ramen", description: "Rich pork broth", priceCents: 1500 },
        ],
      },
    },
  });

  await prisma.drop.create({
    data: {
      id: "drop-al-pastor",
      kitchenId: "k-taco-cartel",
      status: "LIVE",
      windowFrom,
      windowTo,
      totalPortions: 12,
      available: 12,
      reserved: 0,
      dishes: {
        create: [
          { id: "dish-al-pastor", name: "Al Pastor Tacos (3)", description: "Pineapple + pork", priceCents: 1100 },
          { id: "dish-horchata", name: "Horchata", description: "Rice & cinnamon", priceCents: 400 },
        ],
      },
    },
  });

  const kitchens = await prisma.kitchen.count();
  const drops = await prisma.drop.count();
  console.log(`seeded kitchen: ${kitchens} kitchens, ${drops} live drops`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
