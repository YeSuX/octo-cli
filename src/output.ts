import yaml from "js-yaml";
import type { JsonObject, JsonValue, OutputFormat, RenderOptions } from "./types.js";
import { isDict, valueToString } from "./utils.js";

// 归一化数据行：把对象/标量都转成“表格可处理”的数组行结构。
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

// 解析最终输出格式：命令行显式指定优先，否则按 TTY 选择默认值。
function resolveFormat(fmt?: OutputFormat): OutputFormat {
  if (fmt) return fmt;
  return process.stdout.isTTY ? "table" : "yaml";
}

// 确定输出列顺序：优先用用户指定列，否则从数据中推导。
function buildColumns(rows: JsonObject[], preferred: string[] | undefined): string[] {
  if (preferred && preferred.length > 0) return preferred;
  const set = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) set.add(key);
  }
  return [...set];
}

// 文本表格渲染。
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

// JSON 渲染。
function renderJson(data: JsonValue): string {
  return JSON.stringify(data, null, 2);
}

// YAML 渲染。
function renderYaml(data: JsonValue): string {
  return yaml.dump(data);
}

// CSV 渲染，包含最小转义处理。
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

// 按格式返回字符串结果，便于测试复用。
export function renderToString(data: JsonValue, opts: RenderOptions = {}): string {
  const fmt = resolveFormat(opts.fmt);
  if (fmt === "json") return renderJson(data);
  if (fmt === "yaml") return renderYaml(data);
  if (fmt === "csv") return renderCsv(data, opts.columns);
  return renderTable(data, opts.columns);
}

// 直接输出到 stdout。
export function render(data: JsonValue, opts: RenderOptions = {}): void {
  const output = renderToString(data, opts);
  process.stdout.write(`${output}\n`);
}
