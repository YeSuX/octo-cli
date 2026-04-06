import { Command } from "commander";
import { beforeEach, describe, expect, test } from "vitest";
import { registerAllCommands } from "../src/commanderAdapter.js";
import { clearRegistry, cli, getRegistry } from "../src/registry.js";

function withCapturedStdout(run: () => Promise<void>): Promise<string> {
  const originalWrite = process.stdout.write.bind(process.stdout);
  let output = "";
  process.stdout.write = (
    chunk: string | Uint8Array,
    encoding?: BufferEncoding | (() => void),
    cb?: () => void,
  ): boolean => {
    output += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    if (typeof encoding === "function") encoding();
    if (cb) cb();
    return true;
  };
  return run()
    .then(() => output)
    .finally(() => {
      process.stdout.write = originalWrite;
    });
}

describe("commander adapter", () => {
  beforeEach(() => clearRegistry());

  test("passes positional args and format option", async () => {
    cli({
      site: "demo",
      name: "echo",
      description: "echo",
      strategy: "public",
      browser: false,
      args: [{ name: "name", type: "string", required: true }],
      async func(_page, kwargs) {
        return { message: String(kwargs.name) };
      },
    });
    const program = new Command().name("octo");
    registerAllCommands(program, getRegistry());

    const output = await withCapturedStdout(async () => {
      await program.parseAsync(["node", "octo", "demo", "echo", "world", "--format", "json"]);
    });

    expect(output).toContain('"message": "world"');
  });
});
