# Phase A 开发计划 v1

## 1. 文档目标

本文档用于指导你从零到一完成 `yourcli` 的 **Phase A：最小可用 CLI 内核**。

这份计划不追求复刻 OpenCLI 全量能力，而是优先建立一个：

- 能启动
- 能发现 adapter
- 能执行 YAML / TS 命令
- 能统一输出
- 能统一报错
- 能被后续浏览器能力平滑接入

的稳定内核。

---

## 2. Phase A 范围

### 2.1 本阶段目标

在不依赖浏览器、daemon、extension、CDP 的前提下，完成以下能力：

- `yourcli list`
- `yourcli validate`
- `yourcli verify`
- 动态发现 `src/clis/**` 与 `~/.yourcli/clis/**` 下的 YAML / TS adapters
- 命令注册表
- 统一执行入口
- 统一输出格式
- 统一错误模型
- 最小测试体系

### 2.2 明确不做

本阶段不做以下内容：

- 浏览器 Bridge
- daemon
- Electron / CDP
- 插件安装系统
- manifest 启动优化
- AI 探索 / 录制 / 生成能力
- 外部 CLI passthrough

这些能力在架构设计上要留扩展口，但不进入 Phase A 开发范围。

---

## 3. 总体实现思路

参考 OpenCLI 的做法，Phase A 采用如下主链路：

1. `main.ts` 启动
2. `discovery.ts` 扫描并加载 adapters
3. adapter 通过 `registry.ts` 注册成统一的 `CliCommand`
4. `cli.ts` 注册内建命令
5. `commanderAdapter.ts` 把 registry 命令挂到 Commander
6. `execution.ts` 执行 `func` 或 `pipeline`
7. `output.ts` 输出结果
8. `errors.ts` 统一错误与退出码

这一阶段的核心原则是：

- 把“命令定义”和“命令执行”分开
- 把“CLI 框架逻辑”和“业务逻辑”分开
- 把“适配器生态”和“CLI 主体”解耦

---

## 4. 目录建议

建议 Phase A 先落到以下最小目录：

```text
yourcli/
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
    clis/
      demo/
        hello.yaml
        ping.ts
  tests/
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

`pipeline/` 是否要在 Phase A 单独拆目录，取决于你打算把 YAML 执行器做多完整：

- 如果只做极简版，可以先把 pipeline 执行逻辑放进 `execution.ts`
- 如果你想后续平滑升级，建议现在就建 `src/pipeline/`

我建议现在就建 `src/pipeline/`，即使只做最少几个 step，也能减少后续重构成本。

---

## 5. 核心模块计划

## 5.1 `registry.ts`

### 目标

建立全系统统一命令模型。

### 需要定义

- `Strategy` 枚举
- `Arg` 类型
- `CliCommand` 类型
- `CliOptions` 类型
- `cli()` 注册函数
- `registerCommand()`
- `getRegistry()`
- `fullName()`

### 建议字段

`CliCommand` 建议至少包含：

- `site`
- `name`
- `description`
- `strategy`
- `browser`
- `args`
- `columns`
- `func`
- `pipeline`
- `timeoutSeconds`
- `navigateBefore`
- `defaultFormat`
- `aliases`
- `source`

### 设计要求

- registry 存在 `globalThis`
- 支持 alias 映射到同一 command 实例
- 后注册同名命令可以覆盖前注册命令
- 不依赖 Commander
- 不依赖浏览器能力

### 完成定义

- 能从任意模块调用 `cli({...})` 完成注册
- `getRegistry()` 可以稳定返回所有命令
- `fullName({site:'demo',name:'hello'})` 输出 `demo/hello`

---

## 5.2 `discovery.ts`

### 目标

动态发现并加载 YAML / TS adapters。

### 第一版支持来源

- 内置目录：`src/clis`
- 用户目录：`~/.yourcli/clis`

### 扫描规则

目录约定：

```text
src/clis/<site>/*.yaml
src/clis/<site>/*.yml
src/clis/<site>/*.ts
~/.yourcli/clis/<site>/*.yaml
~/.yourcli/clis/<site>/*.yml
~/.yourcli/clis/<site>/*.ts
```

### 建议实现

拆成这些函数：

- `discoverClis(...dirs)`
- `discoverClisFromFs(dir)`
- `registerYamlCli(filePath, defaultSite)`
- `isCliModule(filePath)`

### TS adapter 加载规则

- `import()` 模块
- 模块导入时自行调用 `cli(...)` 注册
- 第一版不做 manifest stub 和懒加载

### YAML adapter 加载规则

- 读取文件
- `js-yaml` 解析
- 做最小 schema 校验
- 转为 `CliCommand`
- 直接注册到 registry

### 风险点

- 用户目录不存在时应静默跳过
- TS 文件里测试文件和声明文件要跳过
- YAML 解析失败不能拖垮整个 CLI 启动，应该记录 warning

### 完成定义

- `src/clis/demo/hello.yaml` 会自动出现在 `yourcli list`
- `src/clis/demo/ping.ts` 会自动出现在 `yourcli list`
- 用户目录下新增 adapter 不需要改主程序代码

---

## 5.3 `commanderAdapter.ts`

### 目标

把 registry 中的 `CliCommand` 动态挂成 Commander 命令。

### 只负责三件事

- 注册 site / command
- 收集 positional args 和 named options
- 调用 `executeCommand()` 并渲染输出 / 处理异常

### 不负责

- adapter 执行业务
- pipeline 解析
- browser session
- discovery

### 建议函数

- `registerAllCommands(program)`
- `registerCommandToProgram(siteCmd, cmd)`
- `normalizeArgValue(argType, value, name)`

### Commander 层统一选项

建议所有动态命令统一支持：

- `-f, --format <fmt>`
- `-v, --verbose`

后续再扩展：

- `--timeout`
- `--raw`

### 错误处理要求

- `executeCommand()` 抛出的 typed error 由这里统一展示
- 这里负责设置 `process.exitCode`
- 这里不吞掉调试信息

### 完成定义

- 执行 `yourcli demo hello --limit 3 -f json` 能正确透传参数
- 错误命令能输出统一格式的报错信息

---

## 5.4 `execution.ts`

### 目标

定义统一执行入口 `executeCommand()`。

### 推荐执行顺序

1. 参数校验和类型转换
2. `onBeforeExecute` hook
3. 判断是否需要 browser session
4. 执行 `func` 或 `pipeline`
5. `onAfterExecute` hook
6. 返回结果给 caller

注意：

- 输出渲染建议仍放在 `commanderAdapter.ts`
- `execution.ts` 负责“执行”，不直接 `console.log`

### 第一阶段的现实实现

虽然会保留“是否需要 browser session”的判断位置，但本阶段可以先采用：

- `browser === false` 或 `strategy === public`：直接执行
- 其他 browser 相关命令：直接抛出 `CommandExecutionError`，提示“Phase A 暂不支持 browser command”

这样后续接入浏览器能力时不用推翻主流程。

### 建议子函数

- `coerceAndValidateArgs()`
- `runCommand()`
- `executePipeline()` 或委托到 `pipeline/executor.ts`
- `ensureRequiredEnv()`，如果你决定现在就留 env 校验口

### 支持的命令执行模式

- `func(page, kwargs, debug)`，Phase A 中 `page` 固定为 `null`
- `pipeline`，用于 YAML adapters

### 完成定义

- TS adapter `func` 能跑通
- YAML adapter `pipeline` 能跑通
- 参数类型错误时抛 `ArgumentError`
- 超时时抛 `TimeoutError`

---

## 5.5 `output.ts`

### 目标

建立后续长期复用的统一输出层。

### 第一阶段必须支持

- `table`
- `json`
- `yaml`
- `csv`

### 建议能力

- 数组对象渲染表格
- 单对象也能转成单行表格
- 非 TTY 默认从 `table` 自动降级到 `yaml`，这一点可以参考 OpenCLI
- 保留 `columns` 参数控制输出列顺序

### 建议函数

- `render(data, opts)`
- `renderTable()`
- `renderJson()`
- `renderYaml()`
- `renderCsv()`
- `normalizeRows()`

### 完成定义

- 同一份结果可被四种格式正确渲染
- `columns` 能控制列顺序
- 空结果表现一致

---

## 5.6 `errors.ts`

### 目标

建立统一错误体系，避免后续靠字符串匹配兜底。

### Phase A 至少定义

- `CliError`
- `ArgumentError`
- `EmptyResultError`
- `TimeoutError`
- `AuthRequiredError`
- `CommandExecutionError`
- `AdapterLoadError`

### 建议补充

- `ConfigError`
- `ValidationError`
- `UnknownCommandError`

### 每个错误建议字段

- `message`
- `hint`
- `code`
- `exitCode`

### 退出码建议

- `0` 成功
- `1` 通用错误
- `2` 参数/用法错误
- `66` 空结果
- `75` 超时 / 临时失败

### 完成定义

- 所有模块抛错优先使用 typed error
- `commanderAdapter.ts` 能根据 error 类型设置 exit code

---

## 5.7 `hooks.ts`

### 目标

即使 Phase A 不做插件系统，也建议先把 hook 框架搭起来。

### 至少支持

- `onStartup`
- `onBeforeExecute`
- `onAfterExecute`

### 设计建议

- 和 OpenCLI 一样挂在 `globalThis`
- hook 异常不应拖垮主执行流程，除非你明确要 fail-fast

### 价值

- 后续插件系统可以直接复用
- 验证和审计逻辑也能挂在 hook 上

---

## 5.8 `validate.ts`

### 目标

提供 `yourcli validate`，检查 adapter 定义是否基本合法。

### 第一版建议覆盖

- YAML 是否能解析
- 必填字段是否存在
- `pipeline` 是否为数组
- `columns` 是否为数组
- `args` 是否为对象或数组，取决于你的 schema 设计
- step 名称是否在白名单中

### TS adapter 第一版策略

第一版可以不做 AST 静态校验，只做：

- 文件可 import
- import 过程中没有语法错误

### 完成定义

- `yourcli validate` 能输出 pass/fail
- 坏掉的 YAML 会明确提示出错文件和原因

---

## 5.9 `verify.ts`

### 目标

提供最小 smoke test，用于验证命令定义不仅“合法”，而且“能执行”。

### 第一版建议策略

- 按 target 执行指定 adapter
- 对 public / browser=false 的命令跑最小执行
- 默认不执行需要浏览器的命令

### 验证内容

- 命令能被发现
- 参数默认值有效
- 执行不抛异常
- 返回值结构基本可渲染

### 完成定义

- `yourcli verify demo/hello`
- `yourcli verify demo`
- `yourcli verify`

都能给出稳定输出

---

## 5.10 `pipeline/` 最小实现建议

虽然你的需求里没单独列出，但只要要支持 YAML adapter，就建议现在把 pipeline 独立出来。

### 第一版最小 step 集

建议只做这 4 到 6 个：

- `fetch`
- `map`
- `filter`
- `limit`
- `sort`
- `tap` 或 `debug`，二选一

### 不建议 Phase A 先做

- `navigate`
- `click`
- `type`
- `wait`
- `intercept`
- `download`

这些都天然偏浏览器阶段。

### 推荐的 Phase A YAML 能力边界

第一版的 YAML adapter，重点解决“公共数据获取与变换”：

- 远程 HTTP JSON 拉取
- 结果字段映射
- 基础筛选、排序、截断

这已经足够支撑最小内核验证。

---

## 6. 里程碑拆解

## 6.1 Milestone A1：项目能启动

### 目标

先做出一个可启动、可列出命令的空壳 CLI。

### 任务清单

1. 初始化 TypeScript + ESM + Commander + Vitest 项目
2. 建立 `src/main.ts`
3. 建立 `src/cli.ts`
4. 建立 `src/registry.ts`
5. 写一个硬编码的内建命令 `list`
6. 让 `yourcli list` 能输出当前 registry 中命令

### 产出

- 项目可启动
- `yourcli --help`
- `yourcli list`

### 验收标准

- 本地执行无报错
- registry 中至少有 1 到 2 个内建命令

---

## 6.2 Milestone A2：动态命令可注册

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

### 推荐 demo adapter

#### YAML adapter

`src/clis/demo/hello.yaml`

建议做成一个最小 public 命令，比如：

- 访问一个公开 JSON endpoint
- `map` 出 `title/url`
- `limit`

#### TS adapter

`src/clis/demo/ping.ts`

直接返回固定结构数据，例如：

- 当前时间
- 参数回显
- 版本号

### 验收标准

- `yourcli demo hello`
- `yourcli demo ping`

都能执行成功

---

## 6.3 Milestone A3：验证与测试打通

### 目标

让最小内核具备基础稳定性。

### 任务清单

1. 实现 `validate.ts`
2. 实现 `verify.ts`
3. 实现 `errors.ts`
4. 实现 `output.ts`
5. 写单测
6. 写 1 到 2 个坏样例 fixture 验证错误处理

### 建议测试数量

10 到 20 个单测是合理范围。

建议优先覆盖：

- registry
- discovery
- execution
- output
- validate
- verify
- commanderAdapter
- errors

### 验收标准

- `yourcli validate` 可用
- `yourcli verify` 可用
- 单测稳定通过

---

## 7. 任务顺序建议

建议严格按下面顺序开发，而不是并行乱铺。

### Step 1

搭项目骨架：

- `package.json`
- `tsconfig.json`
- `vitest.config.ts`
- `src/main.ts`
- `src/cli.ts`

### Step 2

实现 `registry.ts` 和最小 `list`

### Step 3

实现 `discovery.ts`

### Step 4

实现 `execution.ts`

### Step 5

实现最小 `pipeline/`

### Step 6

实现 `commanderAdapter.ts`

### Step 7

补 `output.ts`

### Step 8

补 `errors.ts`

### Step 9

实现 `validate.ts` / `verify.ts`

### Step 10

补测试和样例 adapters

这个顺序的好处是：

- 每一步都有明确反馈
- 不会太早陷入验证和测试细节
- 命令发现、命令执行、输出、错误是按依赖顺序生长的

---

## 8. 建议接口草案

## 8.1 `CliCommand`

```ts
export interface CliCommand {
  site: string;
  name: string;
  aliases?: string[];
  description: string;
  strategy?: 'public' | 'cookie' | 'header' | 'intercept' | 'ui';
  browser?: boolean;
  args: Arg[];
  columns?: string[];
  func?: (page: null, kwargs: Record<string, unknown>, debug?: boolean) => Promise<unknown>;
  pipeline?: Record<string, unknown>[];
  timeoutSeconds?: number;
  navigateBefore?: boolean | string;
  defaultFormat?: 'table' | 'json' | 'yaml' | 'csv';
  source?: string;
}
```

## 8.2 `executeCommand`

```ts
export async function executeCommand(
  cmd: CliCommand,
  rawKwargs: Record<string, unknown>,
  debug = false,
): Promise<unknown>
```

## 8.3 `render`

```ts
export function render(data: unknown, opts?: {
  fmt?: string;
  columns?: string[];
  title?: string;
  elapsed?: number;
}): void
```

---

## 9. 测试计划

## 9.1 单测清单建议

### `registry.test.ts`

- 能注册命令
- 能覆盖同名命令
- alias 正常映射
- `fullName()` 正确

### `discovery.test.ts`

- 能发现 YAML adapter
- 能发现 TS adapter
- 非法 YAML 会被记录
- 不会加载 `.test.ts`

### `execution.test.ts`

- 参数类型转换正确
- `func` 命令可执行
- `pipeline` 命令可执行
- 空结果抛 `EmptyResultError`，如果你决定这样设计
- 超时抛 `TimeoutError`

### `output.test.ts`

- `table/json/yaml/csv` 四种格式可用
- 列顺序可控
- 单对象和数组对象都可输出

### `errors.test.ts`

- 各类错误继承自 `CliError`
- 各类错误具备正确 `exitCode`

### `validate.test.ts`

- 合法 YAML 通过
- 缺字段 YAML 报错
- 未知 pipeline step 给 warning

### `verify.test.ts`

- demo 命令 verify 成功
- 不存在命令 verify 失败

### `commanderAdapter.test.ts`

- positional args 收集正确
- named options 收集正确
- `--format` 正常工作

---

## 9.2 建议 fixture

建议在 `tests/fixtures/` 下准备：

- `good-yaml/`
- `bad-yaml-missing-name/`
- `bad-yaml-invalid-pipeline/`
- `good-ts/`
- `bad-ts-syntax/`

这样 discovery / validate / verify 都可以复用同一批 fixture。

---

## 10. 风险与规避

## 10.1 过早做浏览器抽象

风险：

- 把 Phase A 拖复杂

规避：

- 只在 `execution.ts` 里留 browser hook 位
- 不实现真实 browser session

## 10.2 YAML 设计过重

风险：

- 还没跑起来就陷入 DSL 设计

规避：

- 第一版只支持 4 到 6 个 step
- 能跑通 public fetch 即可

## 10.3 Commander 与执行逻辑耦合

风险：

- 后续不好测试
- CLI 层变胖

规避：

- `commanderAdapter.ts` 保持薄层
- 所有业务执行放 `execution.ts`

## 10.4 错误模型做得太晚

风险：

- 后续模块都抛裸 `Error`
- CLI 层会充满字符串匹配

规避：

- 在 Milestone A2 之前就把 `errors.ts` 定下来

---

## 11. Phase A 完成定义

当以下条件全部满足时，可以认为 Phase A 完成：

1. `yourcli list` 可用
2. `yourcli validate` 可用
3. `yourcli verify` 可用
4. YAML adapter 可自动发现并执行
5. TS adapter 可自动发现并执行
6. 新增 adapter 不需要修改 CLI 主体代码
7. 输出至少支持 `table/json/yaml/csv`
8. 关键错误都有 typed error
9. 至少有 10 到 20 个单测覆盖核心模块
10. 整个系统不依赖浏览器也能稳定运行

---

## 12. 开发节奏建议

如果你希望控制节奏，建议按 5 到 7 天推进：

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
- 清理代码结构

---

## 13. 下一阶段预留口

虽然本阶段不做浏览器，但建议现在就留这些扩展口：

- `strategy`
- `browser`
- `navigateBefore`
- `timeoutSeconds`
- hooks
- 独立 `pipeline/`
- `source`

这样到了 Phase B，你只需要新增：

- `runtime.ts`
- `browser/`
- `daemon`
- `extension`

而不用推翻 Phase A 内核。

---

## 14. 最终建议

如果只给一个实施原则，我会建议你：

**先把“命令是数据、执行是引擎、CLI 只是外壳”这件事做对。**

只要这件事做对了，后面无论接浏览器、Electron、插件还是 AI，都还能继续长。

而如果一开始就把 Commander、adapter、输出、执行、错误揉在一起，后面几乎一定会重写。
