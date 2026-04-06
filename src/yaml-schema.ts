import { ValidationError } from "./errors.js";
import type {
  Arg,
  CliCommand,
  JsonObject,
  JsonValue,
  OutputFormat,
  PipelineStep,
  Strategy,
} from "./types.js";
import { isDict } from "./utils.js";

const STEP_SET = new Set<string>(["fetch", "map", "filter", "sort", "limit", "debug"]);
const STRATEGY_SET = new Set<string>(["public", "cookie", "header", "intercept", "ui"]);
const FORMAT_SET = new Set<string>(["table", "json", "yaml", "csv"]);

function requiredString(obj: JsonObject, key: string, source: string): string {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${source}: "${key}" must be a non-empty string`);
  }
  return value;
}

function optionalBoolean(obj: JsonObject, key: string): boolean | undefined {
  const value = obj[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new ValidationError(`"${key}" must be a boolean`);
  return value;
}

function optionalStringArray(obj: JsonObject, key: string): string[] | undefined {
  const value = obj[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new ValidationError(`"${key}" must be an array`);
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") throw new ValidationError(`"${key}" items must be strings`);
    out.push(item);
  }
  return out;
}

function parseArgs(obj: JsonObject, source: string): Arg[] | undefined {
  const value = obj.args;
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new ValidationError(`${source}: "args" must be an array`);
  const args: Arg[] = [];
  for (const item of value) {
    if (!isDict(item)) throw new ValidationError(`${source}: each arg must be an object`);
    const name = requiredString(item, "name", source);
    const description = typeof item.description === "string" ? item.description : undefined;
    const required = optionalBoolean(item, "required");
    const typeRaw = item.type;
    const type =
      typeRaw === "string" || typeRaw === "number" || typeRaw === "boolean"
        ? typeRaw
        : undefined;
    if (typeRaw !== undefined && type === undefined) {
      throw new ValidationError(`${source}: arg "${name}" has invalid type`);
    }
    const defaultValue = item.default;
    if (
      defaultValue !== undefined &&
      typeof defaultValue !== "string" &&
      typeof defaultValue !== "number" &&
      typeof defaultValue !== "boolean"
    ) {
      throw new ValidationError(`${source}: arg "${name}" default must be scalar`);
    }
    args.push({ name, description, required, type, default: defaultValue });
  }
  return args;
}

function parsePipeline(obj: JsonObject, source: string): PipelineStep[] | undefined {
  const value = obj.pipeline;
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new ValidationError(`${source}: "pipeline" must be an array`);
  const steps: PipelineStep[] = [];
  for (const item of value) {
    if (!isDict(item)) throw new ValidationError(`${source}: pipeline step must be an object`);
    const use = item.use;
    if (typeof use !== "string" || !STEP_SET.has(use)) {
      throw new ValidationError(`${source}: unknown pipeline step "${String(use)}"`);
    }
    if (use === "fetch") {
      const url = requiredString(item, "url", source);
      const methodRaw = item.method;
      const method = methodRaw === "POST" ? "POST" : "GET";
      const headersRaw = item.headers;
      const headers: Record<string, string> = {};
      if (headersRaw !== undefined) {
        if (!isDict(headersRaw)) throw new ValidationError(`${source}: fetch.headers must be object`);
        for (const [key, headerValue] of Object.entries(headersRaw)) {
          if (typeof headerValue !== "string") {
            throw new ValidationError(`${source}: fetch.headers values must be string`);
          }
          headers[key] = headerValue;
        }
      }
      steps.push({ use, url, method, headers: Object.keys(headers).length > 0 ? headers : undefined });
      continue;
    }
    if (use === "map") {
      const pick = item.pick;
      if (pick === undefined || !isDict(pick)) {
        throw new ValidationError(`${source}: map.pick must be object`);
      }
      const mapped: Record<string, string> = {};
      for (const [key, mappedValue] of Object.entries(pick)) {
        if (typeof mappedValue !== "string") {
          throw new ValidationError(`${source}: map.pick values must be string`);
        }
        mapped[key] = mappedValue;
      }
      steps.push({ use, pick: mapped });
      continue;
    }
    if (use === "filter") {
      const field = requiredString(item, "field", source);
      const equals = item.equals;
      if (
        typeof equals !== "string" &&
        typeof equals !== "number" &&
        typeof equals !== "boolean"
      ) {
        throw new ValidationError(`${source}: filter.equals must be string|number|boolean`);
      }
      steps.push({ use, field, equals });
      continue;
    }
    if (use === "sort") {
      const field = requiredString(item, "field", source);
      const order = item.order === "desc" ? "desc" : "asc";
      steps.push({ use, field, order });
      continue;
    }
    if (use === "limit") {
      const count = item.count;
      if (typeof count !== "number" || count < 0) {
        throw new ValidationError(`${source}: limit.count must be a positive number`);
      }
      steps.push({ use, count });
      continue;
    }
    const label = typeof item.label === "string" ? item.label : undefined;
    steps.push({ use: "debug", label });
  }
  return steps;
}

export function parseYamlCli(data: JsonValue, source: string): CliCommand {
  if (!isDict(data)) throw new ValidationError(`${source}: root must be an object`);

  const site = requiredString(data, "site", source);
  const name = requiredString(data, "name", source);
  const description = requiredString(data, "description", source);

  const strategyRaw = data.strategy;
  const strategy = toStrategy(strategyRaw);
  if (strategyRaw !== undefined && strategy === undefined) {
    throw new ValidationError(`${source}: invalid strategy "${String(strategyRaw)}"`);
  }

  const browser = optionalBoolean(data, "browser");
  const columns = optionalStringArray(data, "columns");
  const aliases = optionalStringArray(data, "aliases");
  const args = parseArgs(data, source);
  const pipeline = parsePipeline(data, source);
  const defaultFormatRaw = data.defaultFormat;
  const defaultFormat = toOutputFormat(defaultFormatRaw);
  if (defaultFormatRaw !== undefined && defaultFormat === undefined) {
    throw new ValidationError(`${source}: invalid defaultFormat`);
  }
  const timeoutSecondsRaw = data.timeoutSeconds;
  let timeoutSeconds: number | undefined;
  if (timeoutSecondsRaw !== undefined) {
    if (typeof timeoutSecondsRaw !== "number" || timeoutSecondsRaw <= 0) {
      throw new ValidationError(`${source}: timeoutSeconds must be positive number`);
    }
    timeoutSeconds = timeoutSecondsRaw;
  }
  const navigateBeforeRaw = data.navigateBefore;
  let navigateBefore: boolean | string | undefined;
  if (navigateBeforeRaw !== undefined) {
    if (typeof navigateBeforeRaw !== "boolean" && typeof navigateBeforeRaw !== "string") {
      throw new ValidationError(`${source}: navigateBefore must be boolean|string`);
    }
    navigateBefore = navigateBeforeRaw;
  }

  if (!pipeline) {
    throw new ValidationError(`${source}: "pipeline" is required for yaml adapters`);
  }

  return {
    site,
    name,
    description,
    strategy,
    browser,
    columns,
    aliases,
    args,
    pipeline,
    defaultFormat,
    timeoutSeconds,
    navigateBefore,
    source,
  };
}

function toStrategy(value: JsonValue | undefined): Strategy | undefined {
  if (typeof value !== "string") return undefined;
  if (!STRATEGY_SET.has(value)) return undefined;
  return value as Strategy;
}

function toOutputFormat(value: JsonValue | undefined): OutputFormat | undefined {
  if (typeof value !== "string") return undefined;
  if (!FORMAT_SET.has(value)) return undefined;
  return value as OutputFormat;
}
