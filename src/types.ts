export type Strategy = "public" | "cookie" | "header" | "intercept" | "ui";
export type OutputFormat = "table" | "json" | "yaml" | "csv";
export type ArgType = "string" | "number" | "boolean";
export type Primitive = string | number | boolean | null;
export type ArgValue = string | number | boolean;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonValue = Primitive | JsonObject | JsonValue[];

export interface Arg {
  name: string;
  description?: string;
  type?: ArgType;
  required?: boolean;
  default?: ArgValue;
}

export interface FetchStep {
  use: "fetch";
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
}

export interface MapStep {
  use: "map";
  pick: Record<string, string>;
}

export interface FilterStep {
  use: "filter";
  field: string;
  equals: ArgValue;
}

export interface SortStep {
  use: "sort";
  field: string;
  order?: "asc" | "desc";
}

export interface LimitStep {
  use: "limit";
  count: number;
}

export interface DebugStep {
  use: "debug";
  label?: string;
}

export type PipelineStep =
  | FetchStep
  | MapStep
  | FilterStep
  | SortStep
  | LimitStep
  | DebugStep;

export type CommandResult = JsonValue;

export interface CliCommand {
  site: string;
  name: string;
  description: string;
  aliases?: string[];
  strategy?: Strategy;
  browser?: boolean;
  args?: Arg[];
  columns?: string[];
  func?: (
    page: null,
    kwargs: Record<string, ArgValue>,
    debug?: boolean,
  ) => Promise<CommandResult>;
  pipeline?: PipelineStep[];
  timeoutSeconds?: number;
  navigateBefore?: boolean | string;
  defaultFormat?: OutputFormat;
  source?: string;
}

export interface RenderOptions {
  fmt?: OutputFormat;
  columns?: string[];
  title?: string;
  elapsed?: number;
}

export interface ValidateResult {
  file: string;
  ok: boolean;
  error?: string;
}

export interface VerifyResult {
  command: string;
  ok: boolean;
  skipped?: boolean;
  kind?: string;
  error?: string;
}
