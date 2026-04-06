import { describe, expect, test, beforeEach } from "vitest";
import { clearRegistry, cli, findCommand, fullName, getRegistry } from "../src/registry.js";

describe("registry", () => {
  beforeEach(() => clearRegistry());

  test("registers command", () => {
    cli({
      site: "demo",
      name: "hello",
      description: "hello",
      strategy: "public",
      browser: false,
      async func() {
        return { ok: true };
      },
    });
    const commands = getRegistry();
    expect(commands).toHaveLength(1);
    const first = commands[0];
    expect(first).toBeDefined();
    expect(fullName(first!)).toBe("demo/hello");
  });

  test("maps aliases", () => {
    cli({
      site: "demo",
      name: "hello",
      aliases: ["hi"],
      description: "hello",
      strategy: "public",
      browser: false,
      async func() {
        return { ok: true };
      },
    });
    const alias = findCommand("demo/hi");
    expect(alias?.name).toBe("hello");
  });

  test("overwrites same command", () => {
    cli({
      site: "demo",
      name: "hello",
      description: "v1",
      strategy: "public",
      browser: false,
      async func() {
        return { v: 1 };
      },
    });
    cli({
      site: "demo",
      name: "hello",
      description: "v2",
      strategy: "public",
      browser: false,
      async func() {
        return { v: 2 };
      },
    });
    expect(getRegistry()).toHaveLength(1);
    expect(getRegistry()[0]?.description).toBe("v2");
  });
});
