import { beforeEach, describe, expect, test } from "vitest";
import { executeCommand } from "../src/execution.js";
import { ArgumentError, TimeoutError } from "../src/errors.js";
import type { CliCommand } from "../src/types.js";

describe("execution", () => {
  beforeEach(() => {
    // no shared state for now
  });

  test("executes func command", async () => {
    const cmd: CliCommand = {
      site: "demo",
      name: "ping",
      description: "ping",
      strategy: "public",
      browser: false,
      args: [{ name: "name", type: "string", required: true }],
      async func(_page, kwargs) {
        return { message: `hello ${kwargs.name}` };
      },
    };
    const result = await executeCommand(cmd, { name: "octo" });
    expect(result).toEqual({ message: "hello octo" });
  });

  test("throws on bad argument type", async () => {
    const cmd: CliCommand = {
      site: "demo",
      name: "num",
      description: "num",
      strategy: "public",
      browser: false,
      args: [{ name: "limit", type: "number", required: true }],
      async func() {
        return { ok: true };
      },
    };
    await expect(executeCommand(cmd, { limit: "abc" })).rejects.toBeInstanceOf(ArgumentError);
  });

  test("executes pipeline command", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () =>
      new Response(JSON.stringify([{ id: 2, title: "b" }, { id: 1, title: "a" }]), {
        status: 200,
      });

    const cmd: CliCommand = {
      site: "demo",
      name: "hello",
      description: "hello",
      strategy: "public",
      browser: false,
      pipeline: [
        { use: "fetch", url: "https://example.com" },
        { use: "map", pick: { id: "id", title: "title" } },
        { use: "sort", field: "id", order: "asc" },
        { use: "limit", count: 1 },
      ],
    };
    const result = await executeCommand(cmd, {});
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([{ id: 1, title: "a" }]);
    global.fetch = originalFetch;
  });

  test("throws timeout", async () => {
    const cmd: CliCommand = {
      site: "demo",
      name: "slow",
      description: "slow",
      strategy: "public",
      browser: false,
      timeoutSeconds: 0.01,
      async func() {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 100);
        });
        return { ok: true };
      },
    };
    await expect(executeCommand(cmd, {})).rejects.toBeInstanceOf(TimeoutError);
  });
});
