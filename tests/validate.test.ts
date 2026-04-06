import path from "node:path";
import { describe, expect, test } from "vitest";
import { validateAdapters } from "../src/validate.js";

const fixturesRoot = path.join(process.cwd(), "tests", "fixtures");

describe("validate", () => {
  test("passes valid yaml", async () => {
    const results = await validateAdapters([path.join(fixturesRoot, "good-yaml")]);
    expect(results).toHaveLength(1);
    expect(results[0]?.ok).toBe(true);
  });

  test("fails missing required fields", async () => {
    const results = await validateAdapters([path.join(fixturesRoot, "bad-yaml-missing-name")]);
    expect(results[0]?.ok).toBe(false);
  });

  test("fails invalid pipeline step", async () => {
    const results = await validateAdapters([path.join(fixturesRoot, "bad-yaml-invalid-pipeline")]);
    expect(results[0]?.ok).toBe(false);
  });
});
