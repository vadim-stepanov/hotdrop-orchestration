import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SWC owns transforms so NestJS decorator metadata survives; disable Vitest 4's default Oxc.
export default defineConfig({
  oxc: false,
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: "typescript", decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts", "test/**/*.e2e-spec.ts"],
    setupFiles: ["./test/vitest.setup.ts"],
  },
});
