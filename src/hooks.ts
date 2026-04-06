import type { CliCommand, CommandResult } from "./types.js";

// 系统内置 hook 生命周期。
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

// 全局 hook 容器键。
const HOOKS_KEY = "__octo_hooks__";

interface HooksGlobal {
  __octo_hooks__?: Map<HookName, HookFn[]>;
}

function getHookStore(): Map<HookName, HookFn[]> {
  // 与 registry 一样放到 globalThis，保证所有模块共享。
  const scope = globalThis as typeof globalThis & HooksGlobal;
  scope[HOOKS_KEY] ??= new Map<HookName, HookFn[]>();
  return scope[HOOKS_KEY]!;
}

// 注册单个 hook 处理器。
export function addHook(name: HookName, fn: HookFn): void {
  const store = getHookStore();
  const list = store.get(name) ?? [];
  list.push(fn);
  store.set(name, list);
}

// 按生命周期顺序执行 hook，单个 hook 失败只告警不打断主流程。
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

// 便于测试重置状态。
export function clearHooks(): void {
  getHookStore().clear();
}
