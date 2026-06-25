import { z } from "zod";

// The single root .env carries every service's vars (prefixed). This service reads its
// own; transport/database vars are added when that wiring lands.
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  GATEWAY_PORT: z.coerce.number().int().positive().default(4000),
  // gRPC targets the gateway composes over.
  ORDER_GRPC_URL: z.string().default("localhost:5001"),
  KITCHEN_GRPC_URL: z.string().default("localhost:5002"),
  RATINGS_GRPC_URL: z.string().default("localhost:5005"),
  // The gateway consumes order status changes (RMQ) to push them over WebSockets.
  RABBITMQ_URL: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
