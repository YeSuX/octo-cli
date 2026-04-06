import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test, beforeEach } from "vitest";
import { clearRegistry, getRegistry } from "../src/registry.js";
import { discoverClis, discoverClisFromFs, isCliModule } from "../src/discovery.js";

describe("discovery", () => {
  beforeEach(() => clearRegistry());

  test("filters file names", () => {
    expect(isCliModule("a.yaml")).toBe(true);
    expect(isCliModule("a.yml")).toBe(true);
    expect(isCliModule("a.ts")).toBe(true);
    expect(isCliModule("a.test.ts")).toBe(false);
    expect(isCliModule("a.d.ts")).toBe(false);
    expect(isCliModule("a.txt")).toBe(false);
  });

  test("discovers yaml and ts files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "octo-discovery-"));
    const dir = path.join(root, "demo");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "one.yaml"),
      [
        "site: demo",
        "name: one",
        "description: one",
        "strategy: public",
        "browser: false",
        "pipeline:",
        "  - use: fetch",
        "    url: https://example.com",
      ].join("\n"),
      "utf8",
    );
    await fs.writeFile(path.join(dir, "two.ts"), "export const noop = 1;\n", "utf8");
    const files = await discoverClisFromFs(root);
    expect(files.some((item) => item.endsWith("one.yaml"))).toBe(true);
    expect(files.some((item) => item.endsWith("two.ts"))).toBe(true);
  });

  test("loads yaml adapter into registry", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "octo-discovery-load-"));
    const dir = path.join(root, "demo");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "one.yaml"),
      [
        "site: demo",
        "name: one",
        "description: one",
        "strategy: public",
        "browser: false",
        "pipeline:",
        "  - use: fetch",
        "    url: https://example.com",
      ].join("\n"),
      "utf8",
    );
    await discoverClis([root]);
    expect(getRegistry().map((c) => `${c.site}/${c.name}`)).toContain("demo/one");
  });
});
