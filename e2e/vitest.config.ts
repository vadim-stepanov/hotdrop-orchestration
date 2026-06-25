import { defineConfig } from "vitest/config";

// Black-box tests against a running stack (pnpm dev + pnpm db:seed). Plain fetch, no
// decorators — the default parser is fine; the saga needs generous timeouts.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.e2e-spec.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
