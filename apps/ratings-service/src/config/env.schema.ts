import { z } from "zod";

// The single root .env carries every service's vars (prefixed). This service reads its
// own port, database URL (if it owns one), and the shared RabbitMQ URL.
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  RATINGS_PORT: z.coerce.number().int().positive().default(4005),
  RATINGS_DATABASE_URL: z.string().min(1),
  RABBITMQ_URL: z.string().min(1),
  RATINGS_GRPC_URL: z.string().default("localhost:5005"),
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
