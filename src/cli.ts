import { Command } from "commander";
import { registerAllCommands, handleCliError } from "./commanderAdapter.js";
import { discoverClis } from "./discovery.js";
import { runHooks } from "./hooks.js";
import { render } from "./output.js";
import { getRegistry, fullName } from "./registry.js";
import { validateAdapters } from "./validate.js";
import { verifyCommands } from "./verify.js";
import { defaultDiscoveryRoots } from "./utils.js";

function registerBuiltinCommands(program: Command): void {
  program
    .command("list")
    .description("List all registered commands")
    .option("-f, --format <fmt>", "output format", "table")
    .action((options: { format: "table" | "json" | "yaml" | "csv" }) => {
      const commands = getRegistry().map((cmd) => ({
        command: fullName(cmd),
        strategy: cmd.strategy ?? "public",
        browser: cmd.browser === true ? "yes" : "no",
        source: cmd.source ?? "ts",
      }));
      render(commands, { fmt: options.format, columns: ["command", "strategy", "browser", "source"] });
    });

  program
    .command("validate")
    .description("Validate yaml/ts adapters")
    .option("-f, --format <fmt>", "output format", "table")
    .action(async (options: { format: "table" | "json" | "yaml" | "csv" }) => {
      const results = await validateAdapters(defaultDiscoveryRoots());
      render(
        results.map((item) => ({
          file: item.file,
          ok: item.ok ? "pass" : "fail",
          error: item.error ?? "",
        })),
        { fmt: options.format, columns: ["ok", "file", "error"] },
      );
      if (results.some((item) => !item.ok)) process.exitCode = 2;
    });

  program
    .command("verify [target]")
    .description("Run smoke verification against discovered commands")
    .option("-f, --format <fmt>", "output format", "table")
    .action(async (target: string | undefined, options: { format: "table" | "json" | "yaml" | "csv" }) => {
      const results = await verifyCommands(target);
      render(
        results.map((item) => ({
          command: item.command,
          status: item.skipped ? "skipped" : item.ok ? "pass" : "fail",
          kind: item.kind ?? "",
          error: item.error ?? "",
        })),
        { fmt: options.format, columns: ["command", "status", "kind", "error"] },
      );
      if (results.some((item) => !item.ok)) process.exitCode = 1;
    });
}

export async function createCliProgram(): Promise<Command> {
  const program = new Command();
  program.name("octo").description("OctoCLI Phase A").version("0.1.0");

  registerBuiltinCommands(program);

  await runHooks("onStartup", { cwd: process.cwd() });
  await discoverClis(defaultDiscoveryRoots());
  registerAllCommands(program, getRegistry());

  program.showHelpAfterError();
  program.exitOverride((error) => {
    if (error.code === "commander.helpDisplayed") return;
    throw error;
  });

  return program;
}

export async function runCli(argv: string[]): Promise<void> {
  try {
    const program = await createCliProgram();
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof Error) {
      handleCliError(error);
    } else {
      handleCliError(new Error(String(error)));
    }
  }
}
