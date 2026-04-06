import os from "node:os";
import path from "node:path";
import type { ArgValue, JsonObject, JsonValue } from "./types.js";

export function isDict(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function valueToString(value: JsonValue): string {
  if (value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return JSON.stringify(value);
}

export function defaultDiscoveryRoots(cwd: string = process.cwd()): string[] {
  return [path.join(cwd, "src", "clis"), path.join(os.homedir(), ".octo", "clis")];
}

export function splitTarget(target: string): { site: string; name?: string } {
  const [site, name] = target.split("/");
  return { site: site ?? "", name };
}

export function parseBool(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  throw new Error(`Invalid boolean value: ${value}`);
}

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
