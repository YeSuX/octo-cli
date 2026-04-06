# OctoCLI Phase A 总结文档 v1

## 1. 文档定位

本文档是基于 `docs/plan_v1.md` 的 **实施结果总结**，用于说明 OctoCLI 当前 v1（Phase A）已经落地的产品能力、技术架构、关键实现细节，以及下一阶段的演进边界。

一句话总结当前版本：

**OctoCLI v1 已完成“最小可用 CLI 内核”，实现了从 adapter 发现、命令注册、执行、输出到错误处理的完整闭环。**

---

## 2. 产品视角：v1 交付了什么

## 2.1 产品目标回顾

基于 PRD 和计划文档，Phase A 的核心目标不是生态规模，而是平台内核稳定性。重点是先把“命令中间层”跑通，让后续浏览器能力、插件能力和 AI 调用能力可以建立在统一底座上。

## 2.2 v1 当前可用能力

当前版本已经提供以下用户可见能力：

- `octo list`：列出当前可发现命令
- `octo validate`：校验 YAML/TS adapter 的定义合法性
- `octo verify`：执行 smoke 级命令验证
- 动态发现两类 adapter：
- 内置目录 `src/clis/**`
- 用户目录 `~/.octo/clis/**`
- 支持两种命令执行模式：
- TS `func`
- YAML `pipeline`
- 统一输出格式：`table/json/yaml/csv`
- 统一错误模型（带 `code` + `exitCode`）

## 2.3 v1 有意不覆盖的能力

为确保阶段目标聚焦，以下能力仍保持“预留口”状态：

- 浏览器 bridge / daemon / CDP / Electron
- 插件安装与 manifest 优化
- AI 录制、探索、生成链路
- 外部 CLI passthrough

---

## 3. 技术架构总览

## 3.1 主链路架构

当前实现遵循 plan_v1 既定主链路：

1. `main.ts` 作为进程入口
2. `cli.ts` 装配内建命令与动态命令
3. `discovery.ts` 扫描并加载 YAML/TS adapter
4. `registry.ts` 收敛为统一 `CliCommand`
5. `commanderAdapter.ts` 把命令挂载到 Commander
6. `execution.ts` 统一执行 `func`/`pipeline`
7. `output.ts` 统一渲染输出
8. `errors.ts` 统一错误和退出码

核心数据流如下：

```text
adapter(yaml/ts)
  -> registry
  -> commander command
  -> executeCommand()
  -> render()
  -> stdout / stderr
```

## 3.2 模块分层

系统可分为四层：

- 命令定义层：`types.ts`、`yaml-schema.ts`、adapter 文件
- 命令管理层：`registry.ts`、`discovery.ts`
- 命令执行层：`execution.ts`、`pipeline/*`、`hooks.ts`
- 交互呈现层：`cli.ts`、`commanderAdapter.ts`、`output.ts`、`errors.ts`

这种分层保证了：

- Commander 不耦合业务执行细节
- 执行器不关心输出样式
- adapter 生态可独立扩展

---

## 4. 关键实现细节

## 4.1 统一命令模型（`CliCommand`）

v1 已将 TS/YAML adapter 统一为同一命令结构，关键字段包括：

- 标识类：`site`、`name`、`aliases`
- 执行策略：`strategy`、`browser`
- 参数与输出：`args`、`columns`、`defaultFormat`
- 执行体：`func` 或 `pipeline`
- 扩展字段：`timeoutSeconds`、`navigateBefore`、`source`

这意味着后续新增能力（例如 browser runtime）时，命令定义结构无需推翻。

## 4.2 全局 registry 机制

`registry.ts` 通过 `globalThis` 挂载全局 store，解决了多模块导入下命令状态一致性问题。实现特点：

- `fullName(site/name)` 作为唯一键
- alias 映射到同一命令对象
- 后注册同名覆盖前注册
- `getRegistry()` 去重并稳定排序

## 4.3 动态发现与加载

`discovery.ts` 的职责是“尽可能加载，局部失败不拖垮整体”：

- 递归扫描目录
- 过滤 `.d.ts` 和 `.test.ts`
- YAML 文件走解析+schema 校验+注册
- TS 文件通过 `import()` 加载并自注册
- 单个 adapter 加载失败只记录错误，不中断其他命令

## 4.4 YAML schema 与安全边界

`yaml-schema.ts` 对 YAML adapter 做了结构化校验：

- 必填：`site`、`name`、`description`、`pipeline`
- 可选字段类型校验：`args`、`columns`、`aliases`、`timeoutSeconds` 等
- pipeline step 白名单：`fetch/map/filter/sort/limit/debug`
- 对非法 step 或字段给出明确 `ValidationError`

这保证了“坏配置尽早失败”，避免错误在执行期扩散。

## 4.5 执行引擎与 pipeline

`execution.ts` 定义了统一执行入口：

1. 参数填充与类型转换
2. `onBeforeExecute` hook
3. browser 命令拦截（Phase A）
4. 执行 `func` 或 `pipeline`
5. 超时处理
6. 空结果处理
7. `onAfterExecute` hook

`pipeline/executor.ts` 负责 step 串行执行和上下文传递，支持 `${var}` 插值，已实现步骤：

- `fetch`：HTTP JSON 拉取
- `map`：字段映射
- `filter`：等值过滤
- `sort`：字段排序
- `limit`：结果截断
- `debug`：调试输出（不改变上下文）

## 4.6 输出层统一策略

`output.ts` 将所有命令结果收敛为统一渲染能力：

- 统一行归一化（数组对象/单对象/标量都能处理）
- 支持 `table/json/yaml/csv`
- 支持 `columns` 控制列顺序
- 默认格式策略：TTY 用 `table`，非 TTY 用 `yaml`

## 4.7 错误模型与退出码

`errors.ts` 形成统一 typed error 体系，包含：

- `CliError` 基类
- `ArgumentError`、`ValidationError`、`CommandExecutionError` 等子类
- 每类错误自带 `code`、`exitCode`、可选 `hint`

`commanderAdapter.ts` 中统一处理异常输出和 `process.exitCode`，避免分散处理造成行为不一致。

## 4.8 CLI 交互与帮助行为

`cli.ts` 已处理 Commander 帮助场景的退出行为：

- 正常帮助输出不视为错误
- 无参数启动默认显示帮助并以 `exit 0` 结束

该细节保证了开发模式下体验稳定，不会因为帮助展示导致脚本失败。

---

## 5. 工程与质量状态

## 5.1 工程配置

项目已具备完整的 Phase A 工程基线：

- `package.json` 已配置 `dev/build/typecheck/test`
- `tsconfig.json` 使用严格模式并输出到 `dist`
- `vitest.config.ts` 已接入
- `README.md` 已更新为实际可运行命令

## 5.2 测试覆盖

当前测试文件：

- `registry.test.ts`
- `discovery.test.ts`
- `execution.test.ts`
- `commanderAdapter.test.ts`
- `output.test.ts`
- `errors.test.ts`
- `validate.test.ts`
- `verify.test.ts`

并包含 fixtures：

- `good-yaml`
- `bad-yaml-missing-name`
- `bad-yaml-invalid-pipeline`
- `good-ts`
- `bad-ts-syntax`

v1 当前测试规模满足计划中的“10~20+ 核心测试”目标。

---

## 6. Demo 能力说明

当前内置了两个 demo adapter，用于演示双通道能力：

- `src/clis/demo/ping.ts`：TS `func` 路径
- `src/clis/demo/hello.yaml`：YAML `pipeline` 路径

它们是后续新增站点命令的最小模板，可直接作为扩展参考。

---

## 7. 现阶段边界与风险

## 7.1 已知边界

- browser 相关命令在 Phase A 会被显式拒绝
- pipeline 仍是“公共数据变换”能力，不含交互自动化 step
- validate 对 TS 仍以 import 级校验为主，未做 AST 级静态分析

## 7.2 主要风险

- YAML DSL 逐步扩展时，step 兼容策略需要提前设计版本化规则
- adapter 数量变大后，启动扫描成本可能上升（需 manifest/缓存优化）
- 运行时外部 API 抖动可能影响 verify 稳定性（可逐步引入 mock/录制）

---

## 8. 下一阶段建议（面向 Phase B）

基于当前内核，Phase B 建议优先推进：

1. 引入 `runtime.ts` 与 `browser/` 子系统
2. 将 browser session 接入 `executeCommand()` 的预留判断位
3. 在不改 `CliCommand` 基本结构的前提下增加 browser 执行上下文
4. 保持 Commander 层薄壳，继续避免业务逻辑回流到 CLI 层

核心原则保持不变：

**命令是数据，执行是引擎，CLI 是外壳。**

---

## 9. 结论

OctoCLI v1（Phase A）已经达成计划目标：在无浏览器依赖前提下，完成了一个可运行、可验证、可扩展、可维护的 CLI 内核。

这版实现的真正价值不在于命令数量，而在于架构闭环已经稳定。后续无论扩展浏览器桥接、插件系统还是 AI 工具链，都可以在这套内核之上渐进演化，而无需推翻重写。
