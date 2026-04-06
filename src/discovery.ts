import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import yaml from "js-yaml";
import { AdapterLoadError } from "./errors.js";
import { cli } from "./registry.js";
import type { JsonValue } from "./types.js";
import { parseYamlCli } from "./yaml-schema.js";

export function isCliModule(filePath: string): boolean {
  if (filePath.endsWith(".d.ts")) return false;
  if (filePath.endsWith(".test.ts")) return false;
  return /\.(ya?ml|ts)$/.test(filePath);
}

export async function discoverClisFromFs(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await discoverClisFromFs(fullPath)));
      continue;
    }
    if (isCliModule(fullPath)) files.push(fullPath);
  }
  return files;
}

export async function registerYamlCli(filePath: string): Promise<void> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = yaml.load(raw) as JsonValue;
  const command = parseYamlCli(parsed, filePath);
  cli(command);
}

export async function loadTsCli(filePath: string): Promise<void> {
  const url = pathToFileURL(filePath);
  await import(url.href);
}

export async function discoverClis(roots: string[]): Promise<string[]> {
  const loaded: string[] = [];
  for (const root of roots) {
    const files = await discoverClisFromFs(root);
    for (const filePath of files) {
      try {
        if (filePath.endsWith(".ts")) await loadTsCli(filePath);
        else await registerYamlCli(filePath);
        loaded.push(filePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const wrapped = new AdapterLoadError(`Failed loading ${filePath}: ${message}`);
        process.stderr.write(`${wrapped.message}\n`);
      }
    }
  }
  return loaded;
}
