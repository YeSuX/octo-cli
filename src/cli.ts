import { Command } from "commander";
import { registerAllCommands, handleCliError } from "./commanderAdapter.js";
import { discoverClis } from "./discovery.js";
import { runHooks } from "./hooks.js";
import { render } from "./output.js";
import { getRegistry, fullName } from "./registry.js";
import { validateAdapters } from "./validate.js";
import { verifyCommands } from "./verify.js";
import { defaultDiscoveryRoots } from "./utils.js";

// Commander 异常对象里可能带有 code 字段。
interface CommanderLikeError extends Error {
  code?: string;
}

// 统一识别“展示帮助后退出”这一类正常结束分支。
function isHelpExit(error: CommanderLikeError): boolean {
  if (error.message === "(outputHelp)") return true;
  if (error.code === "commander.help") return true;
  if (error.code === "commander.helpDisplayed") return true;
  return false;
}

// 注册内建命令：list / validate / verify。
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

// 创建并装配完整 CLI 程序实例。
export async function createCliProgram(): Promise<Command> {
  const program = new Command();
  program.name("octo").description("OctoCLI Phase A").version("0.1.0");

  registerBuiltinCommands(program);

  // 启动流程：先跑 startup hooks，再发现 adapter，最后挂载动态命令。
  await runHooks("onStartup", { cwd: process.cwd() });
  await discoverClis(defaultDiscoveryRoots());
  registerAllCommands(program, getRegistry());

  program.showHelpAfterError();
  program.exitOverride((error) => {
    if (isHelpExit(error)) return;
    throw error;
  });

  return program;
}

// CLI 运行入口：负责 parse、帮助输出和统一异常处理。
export async function runCli(argv: string[]): Promise<void> {
  try {
    const program = await createCliProgram();
    if (argv.length <= 2) {
      program.outputHelp();
      process.exitCode = 0;
      return;
    }
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof Error) {
      if (isHelpExit(error)) {
        process.exitCode = 0;
        return;
      }
      handleCliError(error);
    } else {
      handleCliError(new Error(String(error)));
    }
  }
}
