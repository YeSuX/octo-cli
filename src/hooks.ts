import type { CliCommand, CommandResult } from "./types.js";

export type HookName = "onStartup" | "onBeforeExecute" | "onAfterExecute";

export interface StartupPayload {
  cwd: string;
}

export interface BeforeExecutePayload {
  command: CliCommand;
  kwargs: Record<string, string | number | boolean>;
}

export interface AfterExecutePayload {
  command: CliCommand;
  kwargs: Record<string, string | number | boolean>;
  result: CommandResult;
}

export type HookPayload = StartupPayload | BeforeExecutePayload | AfterExecutePayload;
export type HookFn = (payload: HookPayload) => void | Promise<void>;

const HOOKS_KEY = "__octo_hooks__";

interface HooksGlobal {
  __octo_hooks__?: Map<HookName, HookFn[]>;
}

function getHookStore(): Map<HookName, HookFn[]> {
  const scope = globalThis as typeof globalThis & HooksGlobal;
  scope[HOOKS_KEY] ??= new Map<HookName, HookFn[]>();
  return scope[HOOKS_KEY]!;
}

export function addHook(name: HookName, fn: HookFn): void {
  const store = getHookStore();
  const list = store.get(name) ?? [];
  list.push(fn);
  store.set(name, list);
}

export async function runHooks(name: HookName, payload: HookPayload): Promise<void> {
  const list = getHookStore().get(name) ?? [];
  for (const fn of list) {
    try {
      await fn(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[hook:${name}] ${message}\n`);
    }
  }
}

export function clearHooks(): void {
  getHookStore().clear();
}
