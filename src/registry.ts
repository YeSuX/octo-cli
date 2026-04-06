import type { CliCommand } from "./types.js";

// 全局单例键：保证不同模块导入时共享同一份 registry。
const REGISTRY_KEY = "__octo_registry__";

type RegistryStore = Map<string, CliCommand>;

interface RegistryGlobal {
  __octo_registry__?: RegistryStore;
}

function getStore(): RegistryStore {
  // 通过 globalThis 挂载，避免多处实例化导致命令集合分裂。
  const scope = globalThis as typeof globalThis & RegistryGlobal;
  scope[REGISTRY_KEY] ??= new Map<string, CliCommand>();
  return scope[REGISTRY_KEY]!;
}

// 生成唯一命令名：site/name。
export function fullName(cmd: Pick<CliCommand, "site" | "name">): string {
  return `${cmd.site}/${cmd.name}`;
}

// 注册命令，同时把 alias 映射到同一命令对象。
export function registerCommand(command: CliCommand): CliCommand {
  const store = getStore();
  store.set(fullName(command), command);
  for (const alias of command.aliases ?? []) {
    store.set(`${command.site}/${alias}`, command);
  }
  return command;
}

export const cli = registerCommand;

// 返回去重后的命令列表，按命令名排序便于稳定输出。
export function getRegistry(): CliCommand[] {
  const byName = new Map<string, CliCommand>();
  for (const command of getStore().values()) {
    byName.set(fullName(command), command);
  }
  return [...byName.values()].sort((a, b) => fullName(a).localeCompare(fullName(b)));
}

// 通过全名或 alias 直接查找命令。
export function findCommand(name: string): CliCommand | undefined {
  return getStore().get(name);
}

// 测试和重载场景使用：清空 registry。
export function clearRegistry(): void {
  getStore().clear();
}
