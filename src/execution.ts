import {
  ArgumentError,
  CommandExecutionError,
  EmptyResultError,
  TimeoutError,
} from "./errors.js";
import { runHooks } from "./hooks.js";
import { fullName } from "./registry.js";
import type { Arg, CliCommand, JsonValue } from "./types.js";
import { coerceArgValue } from "./utils.js";
import { executePipeline } from "./pipeline/executor.js";

export function coerceAndValidateArgs(
  args: Arg[],
  raw: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const arg of args) {
    const argType = arg.type ?? "string";
    let value = raw[arg.name];
    if (value === undefined && arg.default !== undefined) {
      value = arg.default;
    }
    if (arg.required && value === undefined) {
      throw new ArgumentError(`Missing required arg: ${arg.name}`);
    }
    if (value !== undefined) {
      try {
        out[arg.name] = coerceArgValue(argType, value);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new ArgumentError(`Invalid arg "${arg.name}": ${message}`);
      }
    }
  }
  return out;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function executeCommand(
  cmd: CliCommand,
  rawKwargs: Record<string, string | number | boolean | undefined>,
  debug = false,
): Promise<JsonValue> {
  const kwargs = coerceAndValidateArgs(cmd.args ?? [], rawKwargs);
  await runHooks("onBeforeExecute", { command: cmd, kwargs });

  if (cmd.browser && cmd.strategy !== "public") {
    throw new CommandExecutionError(`Command ${fullName(cmd)} requires browser runtime`, {
      hint: "Phase A does not support browser commands yet",
    });
  }

  const runner = async (): Promise<JsonValue> => {
    if (cmd.func) {
      return cmd.func(null, kwargs, debug);
    }
    if (cmd.pipeline) {
      return executePipeline(cmd.pipeline, kwargs, debug);
    }
    throw new CommandExecutionError(`Command ${fullName(cmd)} has no executor`);
  };

  const timeoutMs = (cmd.timeoutSeconds ?? 30) * 1000;
  const result = await withTimeout(runner(), timeoutMs);
  if (result === null || result === undefined || (Array.isArray(result) && result.length === 0)) {
    throw new EmptyResultError();
  }
  await runHooks("onAfterExecute", { command: cmd, kwargs, result });
  return result;
}
