import { Command } from "commander";
import { executeCommand } from "./execution.js";
import { CliError, printCliError, toCliError } from "./errors.js";
import { render } from "./output.js";
import type { CliCommand } from "./types.js";

interface CommonOptions {
  format?: "table" | "json" | "yaml" | "csv";
  verbose?: boolean;
  timeout?: string;
}

function collectKwargs(
  cmd: CliCommand,
  positional: string[],
): Record<string, string | number | boolean | undefined> {
  const kwargs: Record<string, string | number | boolean | undefined> = {};
  const args = cmd.args ?? [];
  args.forEach((arg, index) => {
    const value = positional[index];
    kwargs[arg.name] = value;
  });
  return kwargs;
}

export function handleCliError(error: Error): never {
  const cliError = toCliError(error);
  printCliError(cliError);
  process.exitCode = cliError.exitCode;
  throw cliError;
}

export function registerCommandToProgram(siteProgram: Command, cmd: CliCommand): void {
  const command = siteProgram.command(cmd.name).description(cmd.description);
  for (const arg of cmd.args ?? []) {
    const token = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
    command.argument(token, arg.description);
  }
  command.option("-f, --format <fmt>", "output format");
  command.option("-v, --verbose", "verbose logs");
  command.option("--timeout <seconds>", "override timeout");

  command.action(async function action(this: Command, ...positional: string[]) {
    const options = this.opts<CommonOptions>();
    const kwargs = collectKwargs(cmd, positional);
    if (options.timeout) kwargs.timeout = options.timeout;
    try {
      const result = await executeCommand(cmd, kwargs, Boolean(options.verbose));
      render(result, {
        fmt: options.format ?? cmd.defaultFormat,
        columns: cmd.columns,
      });
    } catch (error) {
      if (error instanceof Error) handleCliError(error);
      handleCliError(new CliError(String(error)));
    }
  });
}

export function registerAllCommands(program: Command, commands: CliCommand[]): void {
  const groups = new Map<string, Command>();
  for (const cmd of commands) {
    let siteProgram = groups.get(cmd.site);
    if (!siteProgram) {
      siteProgram = program.command(cmd.site).description(`${cmd.site} commands`);
      groups.set(cmd.site, siteProgram);
    }
    registerCommandToProgram(siteProgram, cmd);
  }
}
