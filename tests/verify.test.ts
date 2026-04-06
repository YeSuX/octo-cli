import { beforeEach, describe, expect, test } from "vitest";
import { clearRegistry, cli } from "../src/registry.js";
import { verifyCommands } from "../src/verify.js";

describe("verify", () => {
  beforeEach(() => clearRegistry());

  test("verifies command by full target", async () => {
    cli({
      site: "demo",
      name: "ping",
      description: "ping",
      strategy: "public",
      browser: false,
      async func() {
        return { ok: true };
      },
    });
    const results = await verifyCommands("demo/ping");
    expect(results).toHaveLength(1);
    expect(results[0]?.ok).toBe(true);
  });

  test("verifies command by site target", async () => {
    cli({
      site: "demo",
      name: "a",
      description: "a",
      strategy: "public",
      browser: false,
      async func() {
        return { ok: true };
      },
    });
    cli({
      site: "demo",
      name: "b",
      description: "b",
      strategy: "public",
      browser: false,
      async func() {
        return { ok: true };
      },
    });
    const results = await verifyCommands("demo");
    expect(results).toHaveLength(2);
    expect(results.every((item) => item.ok)).toBe(true);
  });
});
