import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";

// Conformance to the REST contract frozen here: the gateway must expose exactly the
// frozen routes (path + method) and DTO shapes (schema names + property sets), both
// directions. Sibling implementations reuse this against the same docs/openapi.json. Runs under SWC so
// decorator metadata is present (a plain tsx script can't boot the Nest app).
type Spec = {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, { properties?: Record<string, unknown> }> };
};

function routes(spec: Spec): Set<string> {
  const out = new Set<string>();
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const method of Object.keys(methods)) out.add(`${method.toUpperCase()} ${path}`);
  }
  return out;
}

function schemaProps(spec: Spec): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [name, schema] of Object.entries(spec.components.schemas)) {
    out.set(name, Object.keys(schema.properties ?? {}).sort());
  }
  return out;
}

describe("API contract conformance (e2e)", () => {
  let app: INestApplication;
  let live: Spec;
  let frozen: Spec;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const config = new DocumentBuilder().setTitle("HotDrop API").setVersion("1.0").build();
    live = SwaggerModule.createDocument(app, config) as unknown as Spec;
    // The gateway runs with cwd = apps/gateway; the frozen contract is at repo/docs.
    frozen = JSON.parse(
      readFileSync(join(process.cwd(), "..", "..", "docs", "openapi.json"), "utf8"),
    ) as Spec;
  });

  afterAll(async () => {
    await app.close();
  });

  it("exposes exactly the frozen routes (path + method)", () => {
    expect([...routes(live)].sort()).toEqual([...routes(frozen)].sort());
  });

  it("exposes exactly the frozen request/response schemas", () => {
    expect([...schemaProps(live).keys()].sort()).toEqual([...schemaProps(frozen).keys()].sort());
  });

  it("each schema has exactly the frozen property set", () => {
    const liveProps = schemaProps(live);
    const frozenProps = schemaProps(frozen);
    for (const [name, props] of frozenProps) {
      expect(liveProps.get(name), `schema ${name}`).toEqual(props);
    }
  });
});
