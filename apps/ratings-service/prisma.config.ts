import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Single root .env for the whole monorepo; the Prisma CLI runs with cwd = this app dir,
// so the root .env is two levels up. Each service reads its own prefixed URL.
try {
  process.loadEnvFile(path.join("..", "..", ".env"));
} catch {
  // No .env file — fall back to the ambient environment (CI, container, shell).
}

export default defineConfig({
  schema: path.join("prisma", "schema"),
  datasource: {
    url: env("RATINGS_DATABASE_URL"),
  },
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
