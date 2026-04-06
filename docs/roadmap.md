# OpenCLI Clone 实施计划

## 1. 目标定义

本文档的目标不是机械地 1:1 搬运 OpenCLI 当前仓库，而是指导你从零到一做出一个：

- 能运行
- 能扩展
- 能持续维护
- 能承载你自己的私有功能

的同类项目。

建议把目标拆成两个层次：

1. **第一层：可用内核**
   - 能启动一个统一 CLI
   - 能注册内置命令
   - 能发现本地 adapters
   - 能执行 YAML / TS 两类 adapters
   - 能输出 table/json/yaml/csv
   - 能连上浏览器 bridge 或 CDP

2. **第二层：平台化能力**
   - 插件安装与管理
   - 外部 CLI passthrough
   - 浏览器 extension + daemon
   - Electron 应用适配
   - AI 辅助发现、录制、生成
   - 你自己的私有功能与私有适配器生态

结论先说清楚：

- **不要一开始就 clone 全量站点生态。**
- 正确路线是：**先 clone 架构，再 clone 最小闭环，再 clone 生态规模。**

---

## 2. 推荐 clone 策略

### 2.1 你真正要 clone 的是什么

OpenCLI 的核心不是“很多网站命令”，而是下面这套平台模型：

1. **统一命令注册表**
2. **统一执行引擎**
3. **统一输出层**
4. **统一 adapter 规范**
5. **浏览器会话复用**
6. **插件与外部 CLI 接入**

如果这 6 件事做对了，后面增加网站和私有功能只是不断往里填 adapter。

### 2.2 不建议直接 clone 的部分

这些内容不建议作为第一阶段目标：

- 70+ 站点的全量适配器
- 所有测试全部复刻
- 所有文档全部复刻
- 所有 AI 命令（`explore` / `synthesize` / `generate` / `cascade`）一步到位
- 完整的浏览器 anti-detection 细节

原因很简单：

- 体量大
- 验证成本高
- 很多 adapter 依赖具体站点行为，容易把你拖进细节泥潭

### 2.3 正确的分层路线

建议按 5 个阶段推进：

1. **Phase A: 最小可用 CLI 内核**
2. **Phase B: Browser Bridge 与 daemon**
3. **Phase C: Adapter 生态与插件系统**
4. **Phase D: Electron / 外部 CLI / AI 辅助能力**
5. **Phase E: 私有功能与差异化能力**

---

## 3. 技术方案总览

基于当前仓库，建议你的 clone 版本保持同类技术栈，先不要做技术换血。

### 3.1 推荐技术栈

- 运行时：Node.js 20+
- 语言：TypeScript
- 模块系统：ESM
- CLI 框架：Commander
- 测试：Vitest
- YAML 解析：`js-yaml`
- 网络：`undici`
- 输出渲染：自己封装 table/json/yaml/csv/md

### 3.2 推荐目录骨架

建议一开始就定好这套目录，后续扩展阻力最小：

```text
yourcli/
  src/
    main.ts
    cli.ts
    registry.ts
    discovery.ts
    execution.ts
    runtime.ts
    output.ts
    errors.ts
    commanderAdapter.ts
    plugin.ts
    plugin-manifest.ts
    hooks.ts
    browser/
      index.ts
      bridge.ts
      daemon-client.ts
      page.ts
      cdp.ts
    pipeline/
      executor.ts
      registry.ts
      template.ts
      steps/
    commands/
      daemon.ts
    clis/
      demo/
        hot.yaml
      google/
        search.ts
  extension/
  docs/
  tests/
  package.json
  tsconfig.json
  vitest.config.ts
```

### 3.3 与原项目的模块映射

如果你希望按 OpenCLI 的结构对齐，优先参考这些文件：

- 启动入口：[src/main.ts](/Users/suxiong/workspace/2026_4/opencli/src/main.ts)
- CLI 装配：[src/cli.ts](/Users/suxiong/workspace/2026_4/opencli/src/cli.ts)
- 执行引擎：`src/execution.ts`
- 命令发现：`src/discovery.ts`
- 注册表：`src/registry.ts`
- 动态挂载：`src/commanderAdapter.ts`
- 浏览器桥接：`src/browser/*`
- daemon：`src/daemon.ts`
- YAML pipeline：`src/pipeline/*`
- 插件系统：`src/plugin.ts`、`src/plugin-manifest.ts`
- 外部 CLI：`src/external.ts`

---

## 4. 实施阶段

## 4.1 Phase A：最小可用 CLI 内核

### 目标

先做出一个没有浏览器也能工作的 CLI 平台。

### 交付物

- `yourcli list`
- `yourcli validate`
- `yourcli verify`
- 动态发现 `src/clis/**` 下的 YAML / TS adapters
- 命令注册表
- 统一输出格式
- 统一错误模型

### 需要实现的模块

#### 1. `registry.ts`

定义核心 `CliCommand` 结构，建议保留这些字段：

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

同时提供：

- `cli(command)` 注册函数
- `getRegistry()`
- `fullName(command)`

建议和 OpenCLI 一样，把 registry 放到 `globalThis`，避免插件和宿主多实例导致状态分裂。

#### 2. `discovery.ts`

第一版先支持两种来源：

- 内置目录：`src/clis`
- 用户目录：`~/.yourcli/clis`

扫描规则：

- `*.yaml`
- `*.yml`
- `*.ts`

第一版可以不做 manifest 优化，先直接扫描与 import。

#### 3. `commanderAdapter.ts`

负责把 `CliCommand` 转成 Commander 子命令。

只做三件事：

- 收参数
- 调执行器
- 渲染输出 / 处理异常

不要把业务逻辑塞进这里。

#### 4. `execution.ts`

定义统一执行入口 `executeCommand()`。

执行顺序建议固定为：

1. 参数校验与类型转换
2. `onBeforeExecute` hook
3. 判断是否需要 browser session
4. 执行 `func` 或 `pipeline`
5. `onAfterExecute` hook
6. 输出格式化

#### 5. `output.ts`

第一阶段至少支持：

- `table`
- `json`
- `yaml`
- `csv`

这是后续给 AI、脚本、人工终端三类用户共用的基础层。

#### 6. `errors.ts`

先把错误分型建起来，后面会省很多维护成本。

建议至少有：

- `ArgumentError`
- `EmptyResultError`
- `TimeoutError`
- `AuthRequiredError`
- `CommandExecutionError`
- `AdapterLoadError`

### 第一阶段里程碑

#### Milestone A1：项目能启动

- 初始化 TypeScript CLI 项目
- 完成 `main.ts` + `cli.ts`
- `yourcli list` 正常输出

#### Milestone A2：动态命令可注册

- 写 1 个 YAML adapter
- 写 1 个 TS adapter
- 两者都能自动发现并执行

#### Milestone A3：验证与测试打通

- `validate` 检查 adapter 结构合法性
- `verify` 做最小 smoke test
- 建立 10 到 20 个单测，覆盖核心模块

### 验收标准

- 不依赖浏览器也能稳定运行
- 新增一个 adapter 不需要改 CLI 主体代码
- 输出格式对脚本友好

---

## 4.2 Phase B：Browser Bridge 与 daemon

### 目标

复刻 OpenCLI 最有辨识度的能力：复用用户真实浏览器登录态。

### 交付物

- 本地 daemon
- 浏览器扩展
- CLI 与 daemon 通信
- daemon 与 extension 通信
- 能建立浏览器 page/session
- 至少 2 个浏览器命令能跑通

### 架构建议

保持与原项目同类架构：

1. CLI 发起请求
2. CLI 连接本地 daemon
3. daemon 与浏览器扩展通信
4. 扩展注入 bridge 能力
5. CLI 通过 page 抽象操作真实页面

### 必做模块

#### 1. `src/daemon.ts`

先只做这些能力：

- 启动
- 状态查询
- 停止
- 基本握手

#### 2. `src/browser/daemon-client.ts`

封装 CLI 到 daemon 的连接。

#### 3. `extension/`

第一版 extension 只需要支持：

- 识别当前 tab
- 接收 daemon 指令
- 执行简单 DOM 读取 / 点击 / 输入
- 回传结果

#### 4. `src/browser/page.ts`

定义统一的页面操作接口，例如：

- `goto`
- `click`
- `type`
- `text`
- `html`
- `eval`
- `wait`
- `screenshot`

### 推荐先做的浏览器命令

不要一上来做复杂站点，先做简单命令：

1. `example title`
2. `example links`
3. `google search`

这样能先验证：

- 会话创建
- DOM 获取
- 用户登录态复用
- 页面跳转

### 风险点

- 浏览器扩展消息链路不稳定
- tab / window 识别错误
- 页面未加载完成就执行
- 权限声明不足
- 不同 Chromium 版本行为差异

### 验收标准

- `doctor` 能告诉用户 extension/daemon 是否正常
- 一个浏览器 adapter 能稳定执行 20 次以上
- 登录态不需要重复输入密码

---

## 4.3 Phase C：Adapter 生态与插件系统

### 目标

让你的 clone 项目从“能运行”变成“能扩展”。

### 交付物

- YAML pipeline 运行时
- TS adapter 运行时
- 插件目录扫描
- 插件安装 / 卸载 / 更新
- 用户自定义 adapter 目录

### 先后顺序

#### 1. 先做 YAML pipeline

这是复制命令生态最快的方式。

建议先实现这些 step：

- `fetch`
- `browser`
- `intercept`
- `transform`
- `download`
- `tap`

第一版不必全做，只要能支撑 3 到 5 个示例 adapter 即可。

#### 2. 再做 TS adapter

TS adapter 用来承载：

- 更复杂的页面状态逻辑
- 多步交互
- 更强的错误处理
- Electron / desktop app 控制

#### 3. 最后做插件

插件系统建议兼容这类结构：

```text
~/.yourcli/plugins/<plugin-name>/
  opencli-plugin.json
  *.yaml
  *.ts
```

### 插件系统的最低要求

- `plugin install`
- `plugin list`
- `plugin uninstall`
- `plugin update`

如果第一版时间紧，可以先只支持本地目录安装，再补 GitHub 安装。

### 推荐实现策略

先做：

- 扫描本地插件目录
- 加载其中的 YAML/TS adapters

后做：

- GitHub clone
- lock 文件
- monorepo 子插件
- 版本约束

### 验收标准

- 安装一个插件后，命令会自动出现在 `list`
- 宿主升级不会轻易打断插件加载
- 用户能在 `~/.yourcli/clis` 放自己的命令

---

## 4.4 Phase D：Electron / 外部 CLI / AI 辅助能力

### 目标

补齐 OpenCLI 的平台差异化能力。

### D1. Electron CLI 化

这部分建议直接沿用 OpenCLI 的分步方式。参考：

- [docs/zh/guide/electron-app-cli.md](/Users/suxiong/workspace/2026_4/opencli/docs/zh/guide/electron-app-cli.md)

先为任意一个 Electron 应用实现 5 个基线命令：

- `status`
- `dump`
- `read`
- `send`
- `new`

原因：

- 这 5 个命令刚好覆盖“连上、看见、读、写、重置状态”
- 是桌面适配器最稳定的最小闭环

### D2. 外部 CLI passthrough

这部分很适合早做，因为 ROI 很高。

至少实现：

- 注册一个外部 CLI
- 在 `list` 中展示
- 透传执行

后续再加：

- 自动安装
- 安装策略
- 外部 CLI 元数据

### D3. AI 辅助命令

如果你也想保留 OpenCLI 的 AI 研发工作流，再逐步补：

- `explore`
- `record`
- `synthesize`
- `generate`
- `cascade`

建议顺序：

1. `record`
2. `explore`
3. `cascade`
4. `synthesize`
5. `generate`

因为：

- `record` 最直接，先拿真实网络与页面行为
- `synthesize/generate` 属于更高层自动化，应该放后面

### 验收标准

- 至少 1 个 Electron app 能稳定控制
- 至少 1 个外部 CLI 能接入并透传
- 至少 1 条“探索 -> 生成 adapter”的链路能跑通

---

## 4.5 Phase E：加入你自己的功能

这是你不该等到最后才想的部分。建议从架构阶段就预留扩展点。

### 你自己的功能应该放在哪

建议分为 4 类：

#### 1. 私有 adapters

适合：

- 你自己的业务系统
- 需要登录的内部网站
- 公司后台
- 私有工具链

放置方式建议：

- `src/clis/private/*`，如果只自己用
- `~/.yourcli/clis/*`，如果希望和主仓库解耦
- 私有 plugin 仓库，如果要跨机器/团队共享

#### 2. 平台级能力增强

适合：

- 更强的缓存
- 任务调度
- 重试与熔断
- 多账号切换
- 代理池
- 结果快照与审计日志

这类能力不要写进单个 adapter，应该放在：

- `execution.ts`
- `runtime.ts`
- `hooks.ts`
- `output.ts`

#### 3. AI / Agent 集成增强

适合：

- 让你的 AI agent 自动发现命令
- 增加 prompt-ready 输出
- MCP / tool manifest 导出
- 命令语义搜索

这类属于平台差异化，非常值得做。

#### 4. 安全与权限模型

如果你未来要给团队或客户使用，建议尽早规划：

- 哪些命令只读
- 哪些命令可写
- 哪些命令需要人工确认
- 哪些命令要审计

这个能力应该在命令元数据层就预留字段，比如：

- `riskLevel`
- `requiresConfirm`
- `scopes`
- `owner`

---

## 5. 推荐 MVP 范围

如果你想控制工程风险，我建议你的 MVP 只做下面这些。

### 必做

- CLI 内核
- registry
- discovery
- commander 动态挂载
- execution
- output
- error model
- YAML adapter 支持
- TS adapter 支持
- daemon
- extension
- `doctor`
- 3 到 5 个 adapters

### 推荐首批 adapters

- 1 个纯 public API adapter
- 1 个需要浏览器登录态的站点 adapter
- 1 个 TS 编程式 adapter
- 1 个 Electron adapter
- 1 个外部 CLI passthrough

### 可以后移

- build-manifest
- 插件 GitHub 安装
- monorepo 插件
- 自动安装外部 CLI
- AI 全链路生成命令
- 大规模文档
- 大规模站点生态

---

## 6. 开发顺序建议

## 第 1 周

- 初始化仓库
- 建立 TypeScript CLI 工程
- 完成 `registry.ts`、`cli.ts`、`main.ts`
- 跑通 `list`

## 第 2 周

- 做 `discovery.ts`
- 支持 YAML / TS 两种 adapter
- 做 `commanderAdapter.ts`
- 写 2 个 demo adapters

## 第 3 周

- 做 `execution.ts`
- 做 `output.ts`
- 做 `errors.ts`
- 做 `validate` / `verify`

## 第 4 周

- 做 daemon
- 做 browser page 抽象
- 做 extension 最小链路
- 做 `doctor`

## 第 5 周

- 做第一个浏览器站点 adapter
- 补测试
- 修链路稳定性问题

## 第 6 周

- 做 YAML pipeline runtime
- 抽公共 step
- 新增 2 到 3 个 adapters

## 第 7 周

- 做插件目录扫描
- 做插件管理基础命令
- 支持用户目录 adapters

## 第 8 周

- 做 Electron 基线适配器
- 做外部 CLI passthrough
- 开始接入你自己的功能

如果你是单人开发，这个节奏是相对稳妥的。若时间有限，可以压缩到 4 周，但不建议同时追求“功能多”和“稳定性高”。

---

## 7. 测试计划

不要等功能做完再补测试。这个项目天然适合“核心稳定，adapter 逐步扩张”的策略。

### 单元测试

优先覆盖：

- registry 注册与查重
- discovery 扫描
- commander 参数映射
- execution 分支逻辑
- output 格式化
- error 到 exit code 映射

### 集成测试

优先覆盖：

- 从 `list` 到命令执行的完整链路
- YAML adapter 执行
- TS adapter 执行
- plugin 加载
- external CLI passthrough

### 端到端测试

只给最关键链路做：

- daemon + extension + browser
- 一个真实登录站点
- 一个 Electron app

### 回归测试策略

每修掉一个 adapter bug，都要补一条 regression test。

否则生态一大，后面会频繁返工。

---

## 8. 关键设计决策

### 决策 1：先平台，后生态

理由：

- 平台一旦定型，新增 adapter 成本会线性下降
- 反过来先堆站点，只会让架构不断返工

### 决策 2：YAML 与 TS 双轨并存

理由：

- YAML 适合快速复制简单命令
- TS 适合复杂逻辑与状态操作
- 两者并存，生态增长速度最快

### 决策 3：浏览器 bridge 与 daemon 分离

理由：

- 权限边界清晰
- CLI 不直接依赖浏览器进程内逻辑
- 更适合做诊断、重连、调试

### 决策 4：插件与宿主解耦

理由：

- 便于加私有功能
- 便于拆商业版/内部版
- 便于后续做社区生态

---

## 9. 风险清单

### 技术风险

- 浏览器扩展链路不稳定
- Electron 应用 CDP 支持不一致
- 某些站点 DOM 变化快，adapter 易碎
- 插件和宿主版本兼容性复杂

### 项目风险

- 一开始 scope 过大
- 过早投入大量站点 adapter
- 缺少统一测试，导致生态越大越难维护

### 应对策略

- 严格按阶段推进
- 每阶段只做最小闭环
- adapter 数量增长必须建立在执行引擎稳定之后
- 先做 5 个高质量 adapter，再考虑做 50 个

---

## 10. 最终建议

如果你的目标是“做一个属于自己的 OpenCLI”，最现实的路线是：

1. 先 clone 它的架构骨架，不 clone 它的全部站点规模
2. 先做可运行内核，再做浏览器桥接
3. 先做 3 到 5 个高质量 adapter，再做插件生态
4. 在 Phase C 之前就预留私有功能的扩展点
5. 你的差异化不要放在“更多站点”，而要放在：
   - 私有系统集成
   - 更强的 agent 协同
   - 更好的权限/审计模型
   - 更适合你自己工作流的命令组织方式

一句话总结：

**你要 clone 的不是 OpenCLI 的“外观”，而是它的“平台内核 + 扩展机制 + 浏览器复用能力”。**

后续如果你愿意，我下一步可以继续帮你把这份计划拆成：

- `todo.md`：逐周执行清单
- `architecture.md`：你的 clone 版本架构设计
- `mvp-scope.md`：第一版必须做/不要做的范围定义
