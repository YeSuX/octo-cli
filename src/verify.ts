import { executeCommand } from "./execution.js";
import { getRegistry, fullName } from "./registry.js";
import type { CliCommand, VerifyResult } from "./types.js";
import { splitTarget } from "./utils.js";

// 根据 verify target 选择命令集合。
function selectCommands(target: string | undefined): CliCommand[] {
  const commands = getRegistry();
  if (!target) return commands;
  const { site, name } = splitTarget(target);
  if (name) return commands.filter((cmd) => cmd.site === site && cmd.name === name);
  return commands.filter((cmd) => cmd.site === site);
}

// smoke verify：验证命令能被正常执行并返回结构化结果。
export async function verifyCommands(target?: string): Promise<VerifyResult[]> {
  const selected = selectCommands(target);
  const results: VerifyResult[] = [];
  for (const cmd of selected) {
    if (cmd.browser && cmd.strategy !== "public") {
      results.push({ command: fullName(cmd), ok: true, skipped: true, kind: "browser-skip" });
      continue;
    }
    try {
      const result = await executeCommand(cmd, {}, false);
      const kind = Array.isArray(result) ? "array" : typeof result;
      results.push({ command: fullName(cmd), ok: true, kind });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ command: fullName(cmd), ok: false, error: message });
    }
  }
  return results;
}
