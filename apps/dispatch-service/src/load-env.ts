import { resolve } from "node:path";

// Load the monorepo root .env into process.env before anything reads config
// (native, no dotenv dep). Each service process runs with cwd = its app dir, so the
// single root .env is two levels up. Falls back silently to the ambient environment.
try {
  process.loadEnvFile(resolve(process.cwd(), "..", "..", ".env"));
} catch {
  // No root .env present — rely on the ambient environment (CI, container, shell).
}
