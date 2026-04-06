import yaml from "js-yaml";
import type { JsonObject, JsonValue, OutputFormat, RenderOptions } from "./types.js";
import { isDict, valueToString } from "./utils.js";

function normalizeRows(data: JsonValue): JsonObject[] {
  if (Array.isArray(data)) {
    const out: JsonObject[] = [];
    for (const item of data) {
      if (isDict(item)) out.push(item);
      else out.push({ value: item });
    }
    return out;
  }
  if (isDict(data)) return [data];
  return [{ value: data }];
}

function resolveFormat(fmt?: OutputFormat): OutputFormat {
  if (fmt) return fmt;
  return process.stdout.isTTY ? "table" : "yaml";
}

function buildColumns(rows: JsonObject[], preferred: string[] | undefined): string[] {
  if (preferred && preferred.length > 0) return preferred;
  const set = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) set.add(key);
  }
  return [...set];
}

function renderTable(data: JsonValue, columns?: string[]): string {
  const rows = normalizeRows(data);
  if (rows.length === 0) return "(empty)";
  const cols = buildColumns(rows, columns);
  const widths = cols.map((col) => col.length);

  for (const row of rows) {
    cols.forEach((col, index) => {
      const text = valueToString(row[col] ?? null);
      widths[index] = Math.max(widths[index] ?? 0, text.length);
    });
  }

  const header = cols.map((col, index) => col.padEnd(widths[index] ?? col.length)).join(" | ");
  const divider = cols.map((_, index) => "-".repeat(widths[index] ?? 3)).join("-|-");
  const body = rows.map((row) =>
    cols
      .map((col, index) => valueToString(row[col] ?? null).padEnd(widths[index] ?? col.length))
      .join(" | "),
  );
  return [header, divider, ...body].join("\n");
}

function renderJson(data: JsonValue): string {
  return JSON.stringify(data, null, 2);
}

function renderYaml(data: JsonValue): string {
  return yaml.dump(data);
}

function renderCsv(data: JsonValue, columns?: string[]): string {
  const rows = normalizeRows(data);
  if (rows.length === 0) return "";
  const cols = buildColumns(rows, columns);
  const encode = (raw: string): string => {
    if (!raw.includes(",") && !raw.includes('"') && !raw.includes("\n")) return raw;
    return `"${raw.replace(/"/g, '""')}"`;
  };
  const header = cols.join(",");
  const lines = rows.map((row) => cols.map((col) => encode(valueToString(row[col] ?? null))).join(","));
  return [header, ...lines].join("\n");
}

export function renderToString(data: JsonValue, opts: RenderOptions = {}): string {
  const fmt = resolveFormat(opts.fmt);
  if (fmt === "json") return renderJson(data);
  if (fmt === "yaml") return renderYaml(data);
  if (fmt === "csv") return renderCsv(data, opts.columns);
  return renderTable(data, opts.columns);
}

export function render(data: JsonValue, opts: RenderOptions = {}): void {
  const output = renderToString(data, opts);
  process.stdout.write(`${output}\n`);
}
