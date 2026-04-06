import os from "node:os";
import path from "node:path";
import type { ArgValue, JsonObject, JsonValue } from "./types.js";

// 判断值是否为普通对象（非数组、非 null）。
export function isDict(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 输出层的通用字符串化规则。
export function valueToString(value: JsonValue): string {
  if (value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return JSON.stringify(value);
}

// 默认扫描目录：项目内置 adapter + 用户目录 adapter。
export function defaultDiscoveryRoots(cwd: string = process.cwd()): string[] {
  return [path.join(cwd, "src", "clis"), path.join(os.homedir(), ".octo", "clis")];
}

// 解析 verify target，支持 "site" 或 "site/name" 两种格式。
export function splitTarget(target: string): { site: string; name?: string } {
  const [site, name] = target.split("/");
  return { site: site ?? "", name };
}

// 把常见布尔文本值转换为 boolean。
export function parseBool(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  throw new Error(`Invalid boolean value: ${value}`);
}

// 统一参数类型转换逻辑。
export function coerceArgValue(
  type: "string" | "number" | "boolean",
  raw: string | number | boolean,
): ArgValue {
  if (type === "string") return String(raw);
  if (type === "number") {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) throw new Error(`Invalid number value: ${String(raw)}`);
    return parsed;
  }
  if (typeof raw === "boolean") return raw;
  return parseBool(String(raw));
}
