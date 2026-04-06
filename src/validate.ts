import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import yaml from "js-yaml";
import { discoverClisFromFs } from "./discovery.js";
import type { JsonValue, ValidateResult } from "./types.js";
import { parseYamlCli } from "./yaml-schema.js";

// 对扫描到的所有 adapter 做基础合法性校验。
export async function validateAdapters(roots: string[]): Promise<ValidateResult[]> {
  const files = (await Promise.all(roots.map((root) => discoverClisFromFs(root)))).flat();
  const results: ValidateResult[] = [];
  for (const file of files) {
    try {
      if (file.endsWith(".ts")) {
        await import(pathToFileURL(file).href);
      } else {
        const raw = await fs.readFile(file, "utf8");
        const parsed = yaml.load(raw) as JsonValue;
        parseYamlCli(parsed, file);
      }
      results.push({ file, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ file, ok: false, error: message });
    }
  }
  return results;
}
