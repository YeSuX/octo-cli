// 命令执行策略：用于区分公开调用和需要上下文（如登录态）的调用。
export type Strategy = "public" | "cookie" | "header" | "intercept" | "ui";
// 统一输出格式枚举。
export type OutputFormat = "table" | "json" | "yaml" | "csv";
// 参数类型枚举。
export type ArgType = "string" | "number" | "boolean";
export type Primitive = string | number | boolean | null;
export type ArgValue = string | number | boolean;

// JSON 对象结构定义。
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonValue = Primitive | JsonObject | JsonValue[];

// 命令参数定义。
export interface Arg {
  name: string;
  description?: string;
  type?: ArgType;
  required?: boolean;
  default?: ArgValue;
}

// 以下是 pipeline 各步骤的结构定义。
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

// 统一命令模型：TS/YAML adapter 都会被转换成该结构。
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

// 输出渲染配置。
export interface RenderOptions {
  fmt?: OutputFormat;
  columns?: string[];
  title?: string;
  elapsed?: number;
}

// validate 命令输出结构。
export interface ValidateResult {
  file: string;
  ok: boolean;
  error?: string;
}

// verify 命令输出结构。
export interface VerifyResult {
  command: string;
  ok: boolean;
  skipped?: boolean;
  kind?: string;
  error?: string;
}
