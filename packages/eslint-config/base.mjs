// @ts-check
// Shared flat ESLint config for the whole monorepo. The plugin modules
// (typescript-eslint, @eslint/js, …) are hoisted to the repo root, so they resolve
// from any workspace package that runs `eslint`. Each consumer re-exports this and
// appends its own `ignores`/overrides.
import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Build output, generated Prisma clients, and tooling config files are not part
    // of any tsconfig `src` project, so typed linting can't parse them — ignore globally.
    ignores: ["**/dist/**", "**/generated/**", "**/*.config.{js,cjs,mjs,ts}"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // supertest response bodies are typed `any`; relax unsafe-* in tests.
    files: ["test/**/*.ts", "src/**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
    },
  },
  eslintConfigPrettier,
);
