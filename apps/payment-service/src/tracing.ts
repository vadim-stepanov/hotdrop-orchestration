import { startTracing } from "@hotdrop/telemetry";

// Must run before any instrumented library loads (see main.ts first import).
startTracing("hotdrop-payment");
