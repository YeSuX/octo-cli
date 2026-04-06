import type { CliCommand } from "./types.js";

const REGISTRY_KEY = "__octo_registry__";

type RegistryStore = Map<string, CliCommand>;

interface RegistryGlobal {
  __octo_registry__?: RegistryStore;
}

function getStore(): RegistryStore {
  const scope = globalThis as typeof globalThis & RegistryGlobal;
  scope[REGISTRY_KEY] ??= new Map<string, CliCommand>();
  return scope[REGISTRY_KEY]!;
}

export function fullName(cmd: Pick<CliCommand, "site" | "name">): string {
  return `${cmd.site}/${cmd.name}`;
}

export function registerCommand(command: CliCommand): CliCommand {
  const store = getStore();
  store.set(fullName(command), command);
  for (const alias of command.aliases ?? []) {
    store.set(`${command.site}/${alias}`, command);
  }
  return command;
}

export const cli = registerCommand;

export function getRegistry(): CliCommand[] {
  const byName = new Map<string, CliCommand>();
  for (const command of getStore().values()) {
    byName.set(fullName(command), command);
  }
  return [...byName.values()].sort((a, b) => fullName(a).localeCompare(fullName(b)));
}

export function findCommand(name: string): CliCommand | undefined {
  return getStore().get(name);
}

export function clearRegistry(): void {
  getStore().clear();
}
