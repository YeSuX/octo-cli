# Phase A 开发计划 v1

## 1. 文档目标

本文档用于指导你从零到一完成 `octo` 的 **Phase A：最小可用 CLI 内核**。

本阶段不追求复刻 OpenCLI 的全部能力，而是优先建立一个稳定、可扩展、便于后续接入浏览器能力的基础内核。完成后，它至少应具备以下特性：

- 能启动
- 能发现 adapter
- 能执行 YAML / TS 命令
- 能统一输出
- 能统一报错
- 能被后续 browser bridge / daemon 平滑接入

一句话概括这阶段的目标：

**先把“命令是数据、执行是引擎、CLI 只是壳”这条主线做对。**

---

## 2. Phase A 范围

### 2.1 本阶段要做什么

在不依赖浏览器、daemon、extension、CDP 的前提下，完成以下能力：

- `octo list`
- `octo validate`
- `octo verify`
- 动态发现 `src/clis/**` 与 `~/.octo/clis/**` 下的 YAML / TS adapters
- 命令注册表
- 统一执行入口
- 统一输出格式
- 统一错误模型
- 最小测试体系

### 2.2 本阶段明确不做什么

以下能力只预留扩展点，不进入 Phase A：

- 浏览器 Bridge
- daemon
- Electron / CDP
- 插件安装系统
- manifest 启动优化
- AI 探索 / 录制 / 生成
- 外部 CLI passthrough

这样做的原因很简单：Phase A 的目标是先建立稳定内核，而不是过早进入复杂集成。

---

## 3. 总体实现思路

推荐把 Phase A 的主链路设计为：

1. `main.ts` 启动 CLI
2. `discovery.ts` 扫描并加载 adapters
3. adapter 通过 `registry.ts` 注册为统一的 `CliCommand`
4. `cli.ts` 注册内建命令
5. `commanderAdapter.ts` 把 registry 命令挂到 Commander
6. `execution.ts` 负责执行 `func` 或 `pipeline`
7. `output.ts` 负责渲染输出
8. `errors.ts` 提供统一错误与退出码

这一阶段的核心原则：

- 把“命令定义”和“命令执行”分开
- 把“CLI 框架逻辑”和“业务逻辑”分开
- 把“adapter 生态”和“CLI 主体”解耦

对应的数据流如下：

```text
adapter(yaml/ts)
  -> registry
  -> commander command
  -> executeCommand()
  -> render()
  -> stdout / stderr
```

---

## 4. 目录建议

建议从一开始就按下面的最小目录组织，后续升级到 Phase B / C 时改动最小：

```text
octo/
  src/
    main.ts
    cli.ts
    registry.ts
    discovery.ts
    execution.ts
    output.ts
    errors.ts
    commanderAdapter.ts
    hooks.ts
    validate.ts
    verify.ts
    yaml-schema.ts
    utils.ts
    pipeline/
      executor.ts
      steps/
        fetch.ts
        map.ts
        filter.ts
        limit.ts
    clis/
      demo/
        hello.yaml
        ping.ts
  tests/
    fixtures/
      good-yaml/
      bad-yaml-missing-name/
      bad-yaml-invalid-pipeline/
      good-ts/
      bad-ts-syntax/
    registry.test.ts
    discovery.test.ts
    execution.test.ts
    commanderAdapter.test.ts
    output.test.ts
    errors.test.ts
    validate.test.ts
    verify.test.ts
  package.json
  tsconfig.json
  vitest.config.ts
```

建议现在就创建 `src/pipeline/`。即便第一版只支持少量 step，独立目录也能降低后续重构成本。

---

## 5. 核心设计

## 5.1 命令模型：`registry.ts`

### 目标

建立全系统统一命令模型，所有 adapter 最终都要归一化为 `CliCommand`。

### 建议类型

```ts
export type Strategy = 'public' | 'cookie' | 'header' | 'intercept' | 'ui';
export type OutputFormat = 'table' | 'json' | 'yaml' | 'csv';
export type ArgType = 'string' | 'number' | 'boolean';

export interface Arg {
  name: string;
  description?: string;
  type?: ArgType;
  required?: boolean;
  default?: unknown;
}

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
    kwargs: Record<string, unknown>,
    debug?: boolean,
  ) => Promise<unknown>;
  pipeline?: PipelineStep[];
  timeoutSeconds?: number;
  navigateBefore?: boolean | string;
  defaultFormat?: OutputFormat;
  source?: string;
}
```

### 设计要求

- registry 挂在 `globalThis`
- alias 指向同一个 command 实例
- 后注册同名命令允许覆盖前注册命令
- 不依赖 Commander
- 不依赖浏览器能力

### 推荐实现

```ts
type RegistryStore = Map<string, CliCommand>;

const REGISTRY_KEY = '__octo_registry__';

function getStore(): RegistryStore {
  const g = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: RegistryStore;
  };
  g[REGISTRY_KEY] ??= new Map();
  return g[REGISTRY_KEY]!;
}

export function fullName(cmd: Pick<CliCommand, 'site' | 'name'>): string {
  return `${cmd.site}/${cmd.name}`;
}

export function registerCommand(command: CliCommand): CliCommand {
  const store = getStore();
  const key = fullName(command);

  store.set(key, command);

  for (const alias of command.aliases ?? []) {
    store.set(`${command.site}/${alias}`, command);
  }

  return command;
}

export const cli = registerCommand;

export function getRegistry(): CliCommand[] {
  const unique = new Map<string, CliCommand>();
  for (const command of getStore().values()) {
    unique.set(fullName(command), command);
  }
  return [...unique.values()].sort((a, b) =>
    fullName(a).localeCompare(fullName(b)),
  );
}
```

### 完成定义

- 任意模块可调用 `cli({...})` 注册命令
- `getRegistry()` 能稳定返回命令列表
- `fullName({ site: 'demo', name: 'hello' })` 输出 `demo/hello`

---

## 5.2 动态发现：`discovery.ts`

### 目标

动态发现并加载 YAML / TS adapters。

### Phase A 支持来源

- 内置目录：`src/clis`
- 用户目录：`~/.octo/clis`

### 扫描规则

```text
src/clis/<site>/*.yaml
src/clis/<site>/*.yml
src/clis/<site>/*.ts
~/.octo/clis/<site>/*.yaml
~/.octo/clis/<site>/*.yml
~/.octo/clis/<site>/*.ts
```

### 推荐拆分函数

- `discoverClis(...dirs)`
- `discoverClisFromFs(dir)`
- `registerYamlCli(filePath, defaultSite)`
- `loadTsCli(filePath)`
- `isCliModule(filePath)`

### 推荐实现思路

```ts
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { pathToFileURL } from 'node:url';

export async function discoverClis(...roots: string[]): Promise<void> {
  for (const root of roots) {
    const files = await discoverClisFromFs(root);
    for (const file of files) {
      try {
        if (file.endsWith('.ts')) {
          await import(pathToFileURL(file).href);
        } else {
          await registerYamlCli(file);
        }
      } catch (error) {
        console.warn(`[discover] failed to load ${file}`, error);
      }
    }
  }
}

export async function discoverClisFromFs(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await discoverClisFromFs(fullPath)));
      continue;
    }

    if (!isCliModule(fullPath)) continue;
    files.push(fullPath);
  }

  return files;
}

export function isCliModule(filePath: string): boolean {
  if (filePath.endsWith('.d.ts')) return false;
  if (filePath.endsWith('.test.ts')) return false;
  return /\.(ya?ml|ts)$/.test(filePath);
}
```

### YAML adapter 的处理方式

YAML adapter 建议做三件事：

1. 读取并解析 YAML
2. 做最小 schema 校验
3. 转成 `CliCommand` 后注册

示例：

```ts
export async function registerYamlCli(filePath: string): Promise<void> {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = yaml.load(raw) as Record<string, unknown>;
  const command = parseYamlCli(parsed, filePath);
  cli(command);
}
```

### TS adapter 的处理方式

- 使用 `import()` 动态加载
- 模块导入时自行调用 `cli(...)`
- 第一版不做 manifest stub 和懒加载

### 风险点

- 用户目录不存在时应静默跳过
- `.test.ts`、`.d.ts` 不应被加载
- YAML 解析失败不能拖垮 CLI 启动，只记录 warning

### 完成定义

- `src/clis/demo/hello.yaml` 会自动出现在 `octo list`
- `src/clis/demo/ping.ts` 会自动出现在 `octo list`
- 用户目录新增 adapter 不需要修改主程序代码

---

## 5.3 命令装配：`commanderAdapter.ts`

### 目标

把 registry 中的 `CliCommand` 动态挂成 Commander 命令。

### 它只负责三件事

- 注册 site / command
- 收集 positional args 和 named options
- 调用 `executeCommand()` 并渲染输出 / 处理异常

### 它不负责什么

- adapter 执行业务
- pipeline 解析
- browser session
- discovery

### 建议统一动态选项

- `-f, --format <fmt>`
- `-v, --verbose`
- `--timeout <seconds>`

### 推荐实现

```ts
import { Command } from 'commander';

export function registerAllCommands(program: Command, commands: CliCommand[]) {
  const siteGroups = new Map<string, Command>();

  for (const cmd of commands) {
    let siteProgram = siteGroups.get(cmd.site);
    if (!siteProgram) {
      siteProgram = program.command(cmd.site);
      siteGroups.set(cmd.site, siteProgram);
    }
    registerCommandToProgram(siteProgram, cmd);
  }
}

function registerCommandToProgram(siteProgram: Command, cmd: CliCommand) {
  const command = siteProgram.command(cmd.name).description(cmd.description);

  for (const arg of cmd.args ?? []) {
    const token = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
    command.argument(token, arg.description);
  }

  command.option('-f, --format <fmt>', 'output format');
  command.option('-v, --verbose', 'verbose logging');
  command.option('--timeout <seconds>', 'override timeout');

  command.action(async (...received) => {
    const commanderCommand = received.at(-1);
    const positional = received.slice(0, -1);
    const options = commanderCommand.opts();
    const kwargs = collectKwargs(cmd, positional, options);

    try {
      const result = await executeCommand(cmd, kwargs, Boolean(options.verbose));
      render(result, {
        fmt: options.format ?? cmd.defaultFormat,
        columns: cmd.columns,
      });
    } catch (error) {
      handleCliError(error);
    }
  });
}
```

### 错误处理要求

- `executeCommand()` 抛出的 typed error 由这里统一展示
- 这里负责设置 `process.exitCode`
- 不吞掉调试信息

### 完成定义

- `octo demo hello --limit 3 -f json` 能正确透传参数
- 错误命令能输出统一格式报错

---

## 5.4 执行引擎：`execution.ts`

### 目标

定义统一执行入口 `executeCommand()`。

### 推荐执行顺序

1. 参数校验和类型转换
2. `onBeforeExecute` hook
3. 判断是否需要 browser session
4. 执行 `func` 或 `pipeline`
5. `onAfterExecute` hook
6. 返回结果给 caller

### Phase A 的现实策略

虽然要预留 browser 判断位，但本阶段可以先采用：

- `browser === false` 或 `strategy === 'public'`：直接执行
- 其他 browser 相关命令：直接抛 `CommandExecutionError`

这样 Phase B 接浏览器时不用推翻主流程。

### 推荐实现

```ts
export async function executeCommand(
  cmd: CliCommand,
  rawKwargs: Record<string, unknown>,
  debug = false,
): Promise<unknown> {
  const kwargs = coerceAndValidateArgs(cmd.args ?? [], rawKwargs);

  await runHooks('onBeforeExecute', { cmd, kwargs });

  if (cmd.browser && cmd.strategy !== 'public') {
    throw new CommandExecutionError(
      `Command ${fullName(cmd)} requires browser runtime`,
      { hint: 'Phase A 暂不支持 browser command' },
    );
  }

  const timeoutMs = (cmd.timeoutSeconds ?? 30) * 1000;
  const runner = async () => {
    if (cmd.func) {
      return cmd.func(null, kwargs, debug);
    }
    if (cmd.pipeline) {
      return executePipeline(cmd.pipeline, kwargs);
    }
    throw new CommandExecutionError(`Command ${fullName(cmd)} has no executor`);
  };

  const result = await withTimeout(runner(), timeoutMs);

  await runHooks('onAfterExecute', { cmd, kwargs, result });
  return result;
}
```

### 参数校验建议

```ts
export function coerceAndValidateArgs(
  args: Arg[],
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const arg of args) {
    let value = raw[arg.name];

    if (value == null && arg.default !== undefined) {
      value = arg.default;
    }

    if (arg.required && value == null) {
      throw new ArgumentError(`Missing required arg: ${arg.name}`);
    }

    if (value != null) {
      result[arg.name] = normalizeArgValue(arg.type ?? 'string', value, arg.name);
    }
  }

  return result;
}
```

### 完成定义

- TS adapter `func` 能跑通
- YAML adapter `pipeline` 能跑通
- 参数类型错误抛 `ArgumentError`
- 超时抛 `TimeoutError`

---

## 5.5 YAML 执行器：`pipeline/`

### 目标

为 YAML adapter 提供一个足够小、足够稳定的执行引擎。

### 第一版建议 step 集

- `fetch`
- `map`
- `filter`
- `limit`
- `sort`
- `tap` 或 `debug`

### 不建议在 Phase A 做的 step

- `navigate`
- `click`
- `type`
- `wait`
- `intercept`
- `download`

这些天然属于浏览器阶段。

### YAML 能力边界

第一版重点支持“公共数据获取与变换”：

- 拉取远程 HTTP JSON
- 字段映射
- 基础筛选
- 排序
- 截断

### 推荐的 step 结构

```ts
export type PipelineStep =
  | { use: 'fetch'; url: string; method?: 'GET' | 'POST' }
  | { use: 'map'; pick: Record<string, string> }
  | { use: 'filter'; field: string; equals?: string | number | boolean }
  | { use: 'sort'; field: string; order?: 'asc' | 'desc' }
  | { use: 'limit'; count: number };
```

### 推荐实现

```ts
export async function executePipeline(
  steps: PipelineStep[],
  kwargs: Record<string, unknown>,
): Promise<unknown> {
  let context: unknown = undefined;

  for (const step of steps) {
    switch (step.use) {
      case 'fetch':
        context = await runFetchStep(step, kwargs);
        break;
      case 'map':
        context = runMapStep(step, context);
        break;
      case 'filter':
        context = runFilterStep(step, context);
        break;
      case 'sort':
        context = runSortStep(step, context);
        break;
      case 'limit':
        context = runLimitStep(step, context);
        break;
      default:
        throw new ValidationError(`Unknown pipeline step: ${(step as any).use}`);
    }
  }

  return context;
}
```

### 一个最小 YAML adapter 示例

`src/clis/demo/hello.yaml`

```yaml
site: demo
name: hello
description: Fetch demo posts
strategy: public
browser: false
defaultFormat: table
columns:
  - id
  - title
args:
  - name: limit
    type: number
    required: false
    default: 3
pipeline:
  - use: fetch
    url: https://jsonplaceholder.typicode.com/posts
  - use: map
    pick:
      id: id
      title: title
  - use: limit
    count: 3
```

如果后面要支持 `${limit}` 这类动态模板，可以在 `fetch` 或 `limit` step 中再补变量替换逻辑，但 Phase A 不必一次做满。

---

## 5.6 统一输出：`output.ts`

### 目标

建立长期复用的统一输出层。

### 第一阶段必须支持

- `table`
- `json`
- `yaml`
- `csv`

### 设计建议

- 数组对象渲染表格
- 单对象自动转单行表格
- 非 TTY 默认从 `table` 自动降级到 `yaml`
- 支持 `columns` 控制列顺序

### 推荐接口

```ts
export function render(
  data: unknown,
  opts: {
    fmt?: OutputFormat;
    columns?: string[];
    title?: string;
    elapsed?: number;
  } = {},
): void {
  const fmt = resolveFormat(opts.fmt);

  switch (fmt) {
    case 'json':
      return renderJson(data);
    case 'yaml':
      return renderYaml(data);
    case 'csv':
      return renderCsv(data, opts.columns);
    default:
      return renderTable(data, opts.columns);
  }
}
```

### 表格输出建议

```ts
function normalizeRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object') return [data as Record<string, unknown>];
  return [{ value: data }];
}
```

### 完成定义

- 同一份结果可用四种格式正确渲染
- `columns` 能控制列顺序
- 空结果行为一致

---

## 5.7 统一错误：`errors.ts`

### 目标

建立统一错误体系，避免后续全靠字符串匹配。

### Phase A 至少定义

- `CliError`
- `ArgumentError`
- `EmptyResultError`
- `TimeoutError`
- `AuthRequiredError`
- `CommandExecutionError`
- `AdapterLoadError`
- `ValidationError`
- `UnknownCommandError`

### 建议结构

```ts
export class CliError extends Error {
  code: string;
  exitCode: number;
  hint?: string;

  constructor(
    message: string,
    opts: { code?: string; exitCode?: number; hint?: string } = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.code = opts.code ?? 'CLI_ERROR';
    this.exitCode = opts.exitCode ?? 1;
    this.hint = opts.hint;
  }
}

export class ArgumentError extends CliError {
  constructor(message: string, hint?: string) {
    super(message, { code: 'ARGUMENT_ERROR', exitCode: 2, hint });
  }
}

export class TimeoutError extends CliError {
  constructor(message = 'Command timed out') {
    super(message, { code: 'TIMEOUT', exitCode: 75 });
  }
}
```

### 退出码建议

- `0` 成功
- `1` 通用错误
- `2` 参数/用法错误
- `66` 空结果
- `75` 超时 / 临时失败

### Commander 层的统一处理

```ts
export function handleCliError(error: unknown): never {
  if (error instanceof CliError) {
    console.error(`Error: ${error.message}`);
    if (error.hint) console.error(`Hint: ${error.hint}`);
    process.exitCode = error.exitCode;
    throw error;
  }

  console.error(error);
  process.exitCode = 1;
  throw error instanceof Error ? error : new Error(String(error));
}
```

### 完成定义

- 各模块抛错优先使用 typed error
- `commanderAdapter.ts` 能根据 error 类型设置 exit code

---

## 5.8 Hook 框架：`hooks.ts`

### 目标

即使 Phase A 不做插件系统，也建议先把 hook 框架搭起来。

### 至少支持

- `onStartup`
- `onBeforeExecute`
- `onAfterExecute`

### 推荐实现

```ts
type HookName = 'onStartup' | 'onBeforeExecute' | 'onAfterExecute';
type HookFn = (payload: Record<string, unknown>) => void | Promise<void>;

const HOOKS_KEY = '__octo_hooks__';

export function addHook(name: HookName, fn: HookFn) {
  const g = globalThis as any;
  g[HOOKS_KEY] ??= new Map<HookName, HookFn[]>();
  const map = g[HOOKS_KEY] as Map<HookName, HookFn[]>;
  const list = map.get(name) ?? [];
  list.push(fn);
  map.set(name, list);
}

export async function runHooks(name: HookName, payload: Record<string, unknown>) {
  const g = globalThis as any;
  const map = (g[HOOKS_KEY] as Map<HookName, HookFn[]>) ?? new Map();
  for (const fn of map.get(name) ?? []) {
    try {
      await fn(payload);
    } catch (error) {
      console.warn(`[hook:${name}]`, error);
    }
  }
}
```

### 价值

- 后续插件系统可直接复用
- 审计、埋点、调试信息都可挂在 hook 上

---

## 5.9 校验命令：`validate.ts`

### 目标

提供 `octo validate`，检查 adapter 定义是否合法。

### 第一版建议覆盖

- YAML 是否能解析
- 必填字段是否存在
- `pipeline` 是否为数组
- `columns` 是否为数组
- `args` 是否符合约定结构
- step 名称是否在白名单中

### TS adapter 的第一版策略

第一版不做 AST 静态校验，只做：

- 文件能否 `import`
- import 过程中是否有语法错误

### 推荐实现

```ts
export async function validateAdapters(files: string[]) {
  const results = [];

  for (const file of files) {
    try {
      if (file.endsWith('.ts')) {
        await import(pathToFileURL(file).href);
      } else {
        const raw = await fs.readFile(file, 'utf8');
        const parsed = yaml.load(raw);
        parseYamlCli(parsed, file);
      }
      results.push({ file, ok: true });
    } catch (error) {
      results.push({ file, ok: false, error: String(error) });
    }
  }

  return results;
}
```

### 完成定义

- `octo validate` 能输出 pass/fail
- 坏掉的 YAML 能明确提示出错文件和原因

---

## 5.10 验证命令：`verify.ts`

### 目标

提供最小 smoke test，用于验证命令定义不仅“合法”，而且“能执行”。

### 第一版建议策略

- 支持按 target 执行指定 adapter
- 对 `public` / `browser=false` 命令执行最小运行
- 默认跳过需要浏览器的命令

### 推荐实现

```ts
export async function verifyCommands(targets: CliCommand[]) {
  const results = [];

  for (const cmd of targets) {
    if (cmd.browser && cmd.strategy !== 'public') {
      results.push({ command: fullName(cmd), skipped: true });
      continue;
    }

    try {
      const result = await executeCommand(cmd, {}, false);
      results.push({
        command: fullName(cmd),
        ok: true,
        kind: Array.isArray(result) ? 'list' : typeof result,
      });
    } catch (error) {
      results.push({
        command: fullName(cmd),
        ok: false,
        error: String(error),
      });
    }
  }

  return results;
}
```

### 完成定义

- `octo verify demo/hello`
- `octo verify demo`
- `octo verify`

都能给出稳定输出。

---

## 6. Demo Adapter 建议

建议在 Phase A 准备两个最小样例，一个验证 YAML pipeline，一个验证 TS func。

### 6.1 YAML adapter

`src/clis/demo/hello.yaml`

用途：

- 验证 `fetch -> map -> limit`
- 验证 `table/json/yaml/csv`
- 验证 discovery 与 validate

### 6.2 TS adapter

`src/clis/demo/ping.ts`

```ts
import { cli } from '../../registry.js';

cli({
  site: 'demo',
  name: 'ping',
  description: 'Return a simple runtime payload',
  strategy: 'public',
  browser: false,
  args: [{ name: 'name', type: 'string', required: false, default: 'world' }],
  columns: ['message', 'timestamp'],
  async func(_page, kwargs) {
    return {
      message: `hello ${String(kwargs.name ?? 'world')}`,
      timestamp: new Date().toISOString(),
      version: 'phase-a',
    };
  },
});
```

用途：

- 验证 TS 动态导入
- 验证 `func` 执行链路
- 验证参数 coercion

---

## 7. 里程碑拆解

## 7.1 Milestone A1：项目能启动

### 目标

先做出一个可启动、可列出命令的空壳 CLI。

### 任务清单

1. 初始化 TypeScript + ESM + Commander + Vitest 项目
2. 建立 `src/main.ts`
3. 建立 `src/cli.ts`
4. 建立 `src/registry.ts`
5. 写一个硬编码的内建命令 `list`
6. 让 `octo list` 能输出当前 registry 中命令

### 验收标准

- `octo --help` 可用
- `octo list` 可用
- registry 中至少有 1 到 2 个内建命令

## 7.2 Milestone A2：动态命令可注册

### 目标

让 YAML / TS adapters 都能被发现并执行。

### 任务清单

1. 实现 `discovery.ts`
2. 实现 YAML schema 最小解析
3. 实现 `execution.ts`
4. 实现最小 `pipeline/executor.ts`
5. 实现 `commanderAdapter.ts`
6. 写 1 个 YAML adapter
7. 写 1 个 TS adapter

### 验收标准

- `octo demo hello` 可执行
- `octo demo ping` 可执行

## 7.3 Milestone A3：验证与测试打通

### 目标

让最小内核具备基础稳定性。

### 任务清单

1. 实现 `validate.ts`
2. 实现 `verify.ts`
3. 实现 `errors.ts`
4. 实现 `output.ts`
5. 写单测
6. 写坏样例 fixture 验证错误处理

### 验收标准

- `octo validate` 可用
- `octo verify` 可用
- 单测稳定通过

---

## 8. 任务顺序建议

建议按依赖顺序推进，不要一开始并行摊太开：

1. 搭项目骨架：`package.json`、`tsconfig.json`、`vitest.config.ts`、`src/main.ts`、`src/cli.ts`
2. 实现 `registry.ts` 和最小 `list`
3. 实现 `discovery.ts`
4. 实现 `execution.ts`
5. 实现最小 `pipeline/`
6. 实现 `commanderAdapter.ts`
7. 实现 `output.ts`
8. 实现 `errors.ts`
9. 实现 `validate.ts` / `verify.ts`
10. 补测试和 demo adapters

这个顺序的好处是：

- 每一步都有明显反馈
- 不会太早陷入 DSL 和测试细节
- discovery、execution、output、errors 以最自然的依赖关系生长

---

## 9. 测试计划

### 单测建议

`registry.test.ts`

- 能注册命令
- 能覆盖同名命令
- alias 正常映射
- `fullName()` 正确

`discovery.test.ts`

- 能发现 YAML adapter
- 能发现 TS adapter
- 非法 YAML 会被记录
- 不会加载 `.test.ts`

`execution.test.ts`

- 参数类型转换正确
- `func` 命令可执行
- `pipeline` 命令可执行
- 超时抛 `TimeoutError`

`output.test.ts`

- `table/json/yaml/csv` 四种格式可用
- 列顺序可控
- 单对象和数组对象都可输出

`errors.test.ts`

- 各类错误继承自 `CliError`
- 各类错误具备正确 `exitCode`

`validate.test.ts`

- 合法 YAML 通过
- 缺字段 YAML 报错
- 未知 pipeline step 报错

`verify.test.ts`

- demo 命令 verify 成功
- 不存在命令 verify 失败

`commanderAdapter.test.ts`

- positional args 收集正确
- named options 收集正确
- `--format` 正常工作

### fixture 建议

建议在 `tests/fixtures/` 下准备：

- `good-yaml/`
- `bad-yaml-missing-name/`
- `bad-yaml-invalid-pipeline/`
- `good-ts/`
- `bad-ts-syntax/`

这样 `discovery`、`validate`、`verify` 可以复用同一批 fixture。

---

## 10. 风险与规避

### 10.1 过早做浏览器抽象

风险：

- 把 Phase A 拖复杂

规避：

- 只在 `execution.ts` 留 browser hook 位
- 不实现真实 browser session

### 10.2 YAML 设计过重

风险：

- 还没跑起来就陷入 DSL 细节

规避：

- 第一版只支持 4 到 6 个 step
- 能跑通 public fetch 即可

### 10.3 Commander 与执行逻辑耦合

风险：

- 后续不好测试
- CLI 层会变胖

规避：

- `commanderAdapter.ts` 只做装配与分发
- 所有业务执行都放 `execution.ts`

### 10.4 错误模型做得太晚

风险：

- 模块开始大量抛裸 `Error`
- CLI 层只能做字符串匹配

规避：

- 在 Milestone A2 结束前就把 `errors.ts` 定下来

---

## 11. Phase A 完成定义

满足以下条件即可认为 Phase A 完成：

1. `octo list` 可用
2. `octo validate` 可用
3. `octo verify` 可用
4. YAML adapter 可自动发现并执行
5. TS adapter 可自动发现并执行
6. 新增 adapter 不需要修改 CLI 主体代码
7. 输出至少支持 `table/json/yaml/csv`
8. 关键错误具备 typed error
9. 至少有 10 到 20 个单测覆盖核心模块
10. 整个系统不依赖浏览器也能稳定运行

---

## 12. 开发节奏建议

如果按一周节奏推进，建议拆成 5 到 7 天：

### Day 1

- 初始化项目
- `main.ts`
- `cli.ts`
- `registry.ts`
- `list`

### Day 2

- `discovery.ts`
- demo YAML / TS adapter

### Day 3

- `execution.ts`
- 最小 `pipeline/`
- `commanderAdapter.ts`

### Day 4

- `output.ts`
- `errors.ts`

### Day 5

- `validate.ts`
- `verify.ts`

### Day 6 到 Day 7

- 单测
- fixture
- 文档
- 清理结构

---

## 13. 下一阶段预留口

虽然 Phase A 不做浏览器能力，但建议现在就保留以下字段或模块边界：

- `strategy`
- `browser`
- `navigateBefore`
- `timeoutSeconds`
- hooks
- 独立 `pipeline/`
- `source`

这样进入 Phase B 时，只需要新增：

- `runtime.ts`
- `browser/`
- `daemon`
- `extension`

而不需要推翻 Phase A 内核。

---

## 14. 最终建议

如果只保留一个实施原则，我建议是：

**先把命令模型、执行引擎、输出层、错误层四件事做薄、做稳、做解耦。**

只要这四件事做对了，后面无论接浏览器、Electron、插件还是 AI，都还能继续长；如果一开始就把 Commander、adapter、执行、输出、报错揉在一起，后面大概率会进入重写周期。
