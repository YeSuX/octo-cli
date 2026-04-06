# OctoCLI 产品需求文档（PRD）

## 1. 文档信息

- 产品名称：`OctoCLI`
- 文档版本：v1.0
- 文档状态：Draft
- 文档类型：从零到一产品 PRD
- 目标读者：产品、研发、测试、设计、未来插件开发者

---

## 2. 产品概述

`OctoCLI` 是一个把网站、Electron 桌面应用、本地命令行工具统一抽象为 CLI 命令的平台。

它的目标不是做单一站点爬虫，也不是做浏览器自动化脚本集合，而是提供一个统一的“自动化命令中间层”，让人和 AI agent 都能通过命令行直接调用真实的网页能力、桌面应用能力和外部 CLI 能力。

产品核心价值：

- 把原本分散的网站操作统一成可组合、可脚本化、可复用的命令
- 复用用户真实浏览器登录态，降低重复登录和账号接管风险
- 用统一 adapter 规范快速扩展命令生态
- 让 AI agent 能自动发现、调用和组合这些命令
- 为后续私有功能、私有系统接入和团队内部自动化提供平台底座

一句话定义：

**OctoCLI 是一个面向终端和 AI agent 的通用自动化 CLI 平台。**

---

## 2.1 产品形象与命名

### 产品形象

产品形象建议定义为一只**章鱼**。

章鱼适合作为该产品的核心形象，原因是：

- 有多条触手，天然对应“同时连接多个网站、桌面应用和 CLI 工具”
- 擅长适应复杂环境，符合 adapter / plugin 式扩展能力
- 动作灵活，符合自动化执行、编排和 agent 调用的产品气质
- 视觉识别度高，便于后续做 logo、命令行欢迎页、文档插画和品牌延展

### 命名建议

基于章鱼形象，产品正式命名建议为：`OctoCLI`

命名 rationale：

- `Octo` 直接来自 octopus，识别成本低
- 能表达“多触手连接多系统”的核心能力
- 与 CLI 产品形态直接组合，名称语义清晰
- 既适合开发者产品，也适合未来作为 agent 工具平台品牌扩展

### 品牌语气

`OctoCLI` 的品牌人格建议是：

- 聪明，但不过度拟人
- 高效、可靠、反应快
- 会连接多个系统，但对外仍保持统一接口
- 面向开发者和 AI agent，都强调“可调用、可组合、可扩展”

### Slogan 建议

建议优先使用以下主 slogan：

**One CLI. Many Hands.**

中文表达可对应为：

**一个 CLI，伸向所有系统的触手。**

可选备用 slogan：

- `Connect more. Script less.`
- `One command layer for every tool you use.`
- `让网站、桌面应用与 CLI 在一个入口里协同工作`

### 视觉语言建议

品牌视觉建议围绕“深海中的高效连接器”展开，而不是卡通宠物化路线。

视觉关键词：

- 深海
- 触手
- 吸盘
- 节点连接
- 信号流动
- 冷静、克制的科技感

视觉原则：

- 不做幼态、卖萌、强二次元风格
- 保持开发者工具应有的专业感和可信度
- 章鱼形象应更偏“聪明的系统协调者”，而不是娱乐化 mascot
- 图形上强调“多连接、多分支、统一控制”的结构隐喻

### Logo 方向

Logo 建议采用“章鱼头部 + 触手节点化”的极简方案。

具体方向：

- 主体轮廓简洁，保证在终端、网页 favicon、GitHub avatar 中都能识别
- 触手不必画满 8 条，可抽象为 3 到 4 条有方向感的连接分支
- 吸盘可抽象为节点或命令点，隐喻 command / adapter / plugin
- 整体避免复杂插画风，更适合做工程产品品牌

建议准备两套版本：

- 图标版：仅章鱼头部与触手符号，适合 CLI、favicon、app icon
- 组合版：图标 + `OctoCLI` 字标，适合官网、README、文档页

### 吉祥物设定边界

如果后续需要更完整的 mascot 设定，建议保持以下边界：

- 可以有轻度人格，但不设计成强剧情角色
- 可以出现在欢迎页、官网插画、文档封面
- 不应频繁干扰命令行核心使用体验
- 不把品牌重点放在“可爱”，而放在“聪明、灵活、可靠”

### CLI 欢迎文案建议

CLI 首屏或 `--help` 顶部欢迎语可优先使用以下版本：

```txt
OctoCLI
One CLI. Many Hands.

Connect websites, desktop apps, and local tools
through one automation command layer.
```

也可以使用更偏中文语境的版本：

```txt
OctoCLI
一个 CLI，伸向所有系统的触手。

把网站、桌面应用和本地工具
统一接入同一个自动化命令层。
```

### 品牌落地建议

在 MVP 阶段，品牌只需要先落地到以下触点：

- CLI 名称与安装说明
- README 标题与一句话介绍
- `doctor` / `list` / `help` 页头部文案
- 浏览器 extension 名称
- 官网或 landing page 首屏

这样可以先建立统一识别，再逐步补充 logo、插画和完整视觉系统。

---

## 3. 背景与问题定义

### 3.1 背景

现实中的自动化需求通常分散在三类目标中：

1. 网站
2. Electron 桌面应用
3. 本地 CLI 工具

但现有方案通常存在这些问题：

- 网页自动化往往是零散脚本，难复用、难维护
- 桌面应用自动化缺乏统一入口
- 本地 CLI 工具彼此孤立，AI agent 很难统一发现和调用
- 很多自动化方案依赖独立登录或 API token，接入成本高
- 当能力逐步扩展时，脚本会失控，难以平台化

### 3.2 要解决的核心问题

`OctoCLI` 需要解决的核心问题是：

1. 如何用统一模型描述不同来源的命令能力
2. 如何稳定复用浏览器真实登录态，而不是重复登录
3. 如何支持既快速开发又可深度定制的 adapter 扩展
4. 如何让命令既适合人使用，也适合 AI agent 调用
5. 如何让系统从 MVP 平滑扩展到插件生态和私有能力平台

---

## 4. 产品目标

### 4.1 业务目标

- 建立一个可持续扩展的自动化 CLI 平台
- 用少量高质量 adapter 验证平台通用性
- 支持后续私有系统接入和私有插件能力
- 为 AI agent 提供标准化可发现工具层

### 4.2 用户目标

- 用户可以通过统一 CLI 调用不同站点和应用
- 用户不需要重复学习每个平台不同的自动化方式
- 用户可以利用真实登录态直接完成读取或操作
- 用户可以低成本新增自己的命令和插件

### 4.3 产品目标

MVP 阶段达成以下目标：

- 提供稳定的 CLI 内核
- 支持 YAML 和 TypeScript 两类 adapter
- 打通浏览器 extension + daemon + CLI 的最小闭环
- 提供插件与用户自定义命令入口
- 支持 AI agent 通过 `list` 等方式发现命令

---

## 5. 非目标

当前阶段不以以下内容为目标：

- 一次性复刻 70+ 站点的全量生态
- 覆盖所有复杂站点和所有边缘场景
- 做成通用 RPA 平台或低代码平台
- 实现所有 AI 自动生成链路的一步到位闭环
- 提供企业级多租户、权限中心、计费中心

这些内容可以作为后续版本扩展，不应进入 MVP 范围。

---

## 6. 目标用户

### 6.1 核心用户

#### 1. 个人开发者 / 高级用户

特征：

- 熟悉 CLI
- 有跨网站、跨工具自动化需求
- 希望把零散脚本收敛成可复用命令

需求：

- 快速接入新命令
- 输出结构化
- 可脚本化调用

#### 2. AI agent 使用者

特征：

- 使用 Claude Code、Codex、Cursor 等 agent
- 希望 agent 能直接操作网页、桌面应用和本地工具

需求：

- 命令可发现
- 命令输入输出稳定
- 适合程序化消费

#### 3. 私有系统集成开发者

特征：

- 希望将公司内部系统、后台、知识库、内部工具接入统一 CLI

需求：

- 私有 adapter
- 插件能力
- 登录态复用
- 可维护、可迭代

### 6.2 次级用户

- 自动化工程师
- 独立开发者
- 研究型用户
- 内容抓取与整理用户

---

## 7. 典型使用场景

### 场景 1：读取网站信息

用户希望在命令行里直接读取某个网站上的公开或登录后内容，例如：

- 热榜
- 搜索结果
- 用户资料
- 收藏列表

成功标准：

- 命令调用简单
- 输出稳定
- 可直接导出为 `json/yaml/csv/md`

### 场景 2：复用浏览器登录态做真实操作

用户已在 Chrome/Chromium 登录目标网站，希望通过 CLI 进行：

- 搜索
- 点赞
- 保存
- 评论
- 发布

成功标准：

- 不需要额外输入账号密码
- 操作稳定
- 失败可诊断

### 场景 3：控制 Electron 桌面应用

用户希望控制桌面应用完成：

- 新建会话
- 读取当前上下文
- 发送消息
- 导出内容

成功标准：

- 能通过 CDP 接入
- 命令模型与网站 adapter 保持一致
- 最小命令集先可用

### 场景 4：统一调用本地 CLI 工具

用户希望把现有 CLI 工具统一纳入平台，例如：

- `gh`
- `docker`
- `obsidian`
- 私有 CLI

成功标准：

- 在统一入口中可发现
- 支持 passthrough
- 未来可增加自动安装与元数据管理

### 场景 5：用户扩展自己的命令

用户希望自己编写 adapter 或插件来接入：

- 私有网站
- 公司后台
- 自己的工作流

成功标准：

- 不需要修改 CLI 主干代码
- 支持本地用户目录扩展
- 支持插件化分发

### 场景 6：AI agent 调用

用户希望 AI agent 自动识别、调用、组合平台命令完成工作流。

成功标准：

- `list` 能暴露命令清单
- 命令输入输出稳定
- 错误可识别
- 对 agent 足够 deterministic

---

## 8. 产品定位

### 8.1 产品定位

`OctoCLI` 的定位是：

**面向终端与 AI agent 的通用自动化命令平台。**

### 8.2 与相邻产品的边界

它不是：

- 通用浏览器测试框架
- 纯粹网页爬虫平台
- 通用桌面自动化平台
- 单一站点下载工具
- 仅给人类手工使用的 CLI 集合

它更像：

- 一个统一命令注册层
- 一个跨网站/桌面/CLI 的执行层
- 一个可持续扩展的 adapter 平台

---

## 9. 核心能力范围

产品能力分成五大域：

1. CLI 内核
2. Browser Bridge
3. Adapter 生态
4. 插件与外部 CLI
5. AI / 私有扩展能力

### 9.1 CLI 内核

包括：

- 启动入口
- 命令注册表
- 命令发现
- 动态挂载到 Commander
- 执行引擎
- 输出系统
- 错误体系

### 9.2 Browser Bridge

包括：

- 本地 daemon
- 浏览器 extension
- CLI 与 daemon 通信
- daemon 与 extension 通信
- 浏览器 page/session 抽象

### 9.3 Adapter 生态

包括：

- YAML pipeline adapter
- TypeScript adapter
- 用户自定义 adapters
- adapter 校验与 smoke test

### 9.4 插件与外部 CLI

包括：

- 本地/远程插件
- 插件安装与管理
- 外部 CLI 注册
- 外部 CLI passthrough

### 9.5 AI / 私有扩展能力

包括：

- 命令发现
- 可供 AI 使用的结构化输出
- 私有系统 adapters
- 后续 AI 辅助探索、录制、生成

---

## 10. MVP 范围

## 10.1 MVP 必须包含

- 基础 CLI 框架
- `list`
- `validate`
- `verify`
- 命令注册表
- `src/clis` 与用户目录发现
- YAML adapter 支持
- TS adapter 支持
- 统一执行引擎
- table/json/yaml/csv 输出
- 基础错误模型
- daemon 最小能力
- extension 最小能力
- `doctor`
- 3 到 5 个代表性 adapters

## 10.2 MVP 推荐包含

- 用户目录 `~/.octocli/clis`
- 本地插件扫描
- 一个 Electron 示例 adapter
- 一个外部 CLI passthrough 示例

## 10.3 MVP 不包含

- GitHub 插件市场式安装的完整体验
- monorepo 子插件管理
- 全量 AI 自动生成链路
- 大规模多账号管理
- 企业级权限管理后台

---

## 11. 功能需求

## 11.1 统一命令注册表

### 需求描述

系统需要有统一命令模型，用于描述所有站点命令、桌面命令和外部命令。

### 核心字段

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

### 用户价值

- 新命令扩展方式统一
- 人和 AI 都能通过同一结构理解命令
- 平台可以统一做发现、执行和校验

### 验收标准

- 任意命令都能映射为统一结构
- 新增命令无需改动 CLI 主干装配逻辑

---

## 11.2 命令发现机制

### 需求描述

系统启动时自动扫描命令来源并注册。

### 扫描来源

- 内置命令目录
- 用户目录
- 插件目录

### 支持类型

- YAML
- YML
- TypeScript

### 验收标准

- 新增 adapter 文件后，重新启动 CLI 即可发现
- 插件命令可以覆盖内置同名命令

---

## 11.3 Commander 动态装配

### 需求描述

系统需要把注册表中的命令动态挂载到 CLI 框架中，而不是手写每个子命令。

### 要求

- 支持 positional 参数
- 支持 options
- 支持别名
- 支持统一错误处理
- 支持统一输出格式

### 验收标准

- 新增命令不需要修改主命令装配代码
- 用户运行体验与原生命令一致

---

## 11.4 统一执行引擎

### 需求描述

系统需要有单一执行入口，统一处理参数、hook、浏览器会话、adapter 执行和输出。

### 执行流程

1. 参数校验与转换
2. `onBeforeExecute`
3. 判断是否需要 browser session
4. 执行 `func` 或 `pipeline`
5. `onAfterExecute`
6. 输出渲染

### 验收标准

- YAML/TS 命令都通过统一入口执行
- 浏览器与非浏览器命令共享一致的外围逻辑

---

## 11.5 输出系统

### 需求描述

系统必须支持结构化输出，满足人工阅读与脚本消费。

### 支持格式

- `table`
- `json`
- `yaml`
- `csv`
- 后续可扩展 `md`

### 验收标准

- 所有核心命令至少支持 `table/json/yaml/csv`
- JSON 输出结构稳定

---

## 11.6 错误与退出码

### 需求描述

系统需要统一错误模型和退出码，便于 shell 与 AI 使用。

### 推荐错误类型

- `ArgumentError`
- `EmptyResultError`
- `TimeoutError`
- `AuthRequiredError`
- `BrowserConnectError`
- `AdapterLoadError`
- `CommandExecutionError`

### 验收标准

- 常见错误能映射为稳定退出码
- 报错信息可读且可诊断

---

## 11.7 Browser Bridge

### 需求描述

系统需要通过浏览器 extension + 本地 daemon 复用真实登录态，支持在已登录页面中执行读取和操作。

### 核心链路

1. CLI 请求 daemon
2. daemon 请求 extension
3. extension 连接真实 tab/page
4. CLI 基于 page 抽象执行操作

### 最小功能

- 状态检测
- 页面连接
- DOM 读取
- 点击
- 输入
- 等待
- 截图

### 验收标准

- `doctor` 可诊断 daemon/extension 状态
- 登录态可复用
- 一个浏览器 adapter 能稳定执行

---

## 11.8 YAML Pipeline Adapter

### 需求描述

系统需要支持声明式命令定义，降低新增 adapter 成本。

### 使用场景

- 简单读取类命令
- 规则明确的流程型命令
- 快速试验新站点

### MVP 所需步骤

- `fetch`
- `transform`
- `browser`
- `tap`

后续扩展：

- `intercept`
- `download`

### 验收标准

- 用纯 YAML 可定义至少 1 个公开站点命令
- YAML adapter 能通过 `validate`

---

## 11.9 TypeScript Adapter

### 需求描述

系统需要支持编程式 adapter，处理更复杂交互和状态逻辑。

### 使用场景

- 复杂 DOM 解析
- 真实交互步骤
- 桌面应用控制
- 多阶段流程

### 验收标准

- TS adapter 可自注册
- TS adapter 能懒加载或动态加载

---

## 11.10 插件系统

### 需求描述

系统需要允许第三方或用户自己分发 adapter 集合。

### MVP 能力

- 插件目录扫描
- `plugin list`
- `plugin install`（可先支持本地）
- `plugin uninstall`

### 后续能力

- GitHub 安装
- lock 文件
- 版本范围校验
- monorepo 子插件

### 验收标准

- 插件安装后可在 `list` 中被发现
- 插件卸载后命令消失

---

## 11.11 外部 CLI 接入

### 需求描述

系统需要把现有本地 CLI 工具纳入统一入口。

### MVP 能力

- 注册外部 CLI
- 展示到命令列表
- passthrough 执行

### 后续能力

- 自动安装
- 二进制检测
- 外部命令元数据展示

### 验收标准

- 一个外部 CLI 能通过平台正常执行
- 输出与原工具行为基本一致

---

## 11.12 Electron 应用适配

### 需求描述

系统需要支持通过 CDP 控制 Electron 桌面应用。

### MVP 能力

为任一 Electron 应用提供 5 个基线命令：

- `status`
- `dump`
- `read`
- `send`
- `new`

### 验收标准

- 能连接到目标应用的 CDP 端口
- 能完成最小读写闭环

---

## 11.13 Doctor / 诊断能力

### 需求描述

系统需要提供一键诊断，降低接入和排障成本。

### 诊断范围

- daemon 是否运行
- extension 是否连接
- 浏览器是否可达
- 必要配置是否完整

### 验收标准

- 用户遇到连接问题时，可通过 `doctor` 快速定位问题

---

## 11.14 AI 友好能力

### 需求描述

系统需要让 AI agent 可以发现和稳定调用命令。

### MVP 能力

- `list`
- 结构化输出
- 稳定错误模型
- 一致的参数模式

### 后续能力

- `operate` 类浏览器控制命令
- `explore`
- `record`
- `generate`

### 验收标准

- AI agent 能通过命令列表理解可用能力
- 命令输出 deterministic

---

## 12. 用户流程

## 12.1 首次使用流程

1. 安装 CLI
2. 安装浏览器 extension
3. 启动或自动启动 daemon
4. 运行 `doctor`
5. 运行 `list`
6. 执行第一个 public 命令
7. 执行第一个 browser 命令

成功标志：

- 用户在 10 分钟内完成第一个命令执行

## 12.2 新增 adapter 流程

1. 用户创建 YAML 或 TS 文件
2. 放到 `src/clis` 或 `~/.octocli/clis`
3. 重启 CLI
4. 运行 `validate`
5. 运行命令验证

成功标志：

- 用户不需要改主干代码即可扩展命令

## 12.3 插件安装流程

1. 用户执行 `plugin install`
2. CLI 下载或链接插件
3. 重启或重新发现命令
4. 插件命令出现在 `list`

成功标志：

- 用户可独立安装和卸载插件

---

## 13. 竞争与差异化

### 13.1 相比零散脚本

优势：

- 有统一命令模型
- 有统一执行与输出层
- 可持续扩展
- 更适合交给 AI 使用

### 13.2 相比纯 Playwright/Puppeteer 自动化

优势：

- 更偏“产品化命令平台”
- 更强调复用真实登录态
- 更适合把能力封装为稳定 CLI

### 13.3 相比通用 CLI 工具集合

优势：

- 不只覆盖本地 CLI
- 还能统一网站和桌面应用
- 支持 adapter 与插件生态

### 13.4 你的差异化方向

建议不要只追求“命令更多”，而应优先做：

- 私有系统接入
- AI agent 工作流深度集成
- 更好的安全/确认机制
- 更强的任务链编排能力

---

## 14. 成功指标

## 14.1 MVP 指标

- CLI 首次安装到首个命令成功执行时间小于 10 分钟
- 至少 3 个内置 adapter 稳定可用
- 至少 1 个 browser adapter 稳定可用
- 至少 1 个 Electron adapter 原型可用
- 至少 1 个外部 CLI 接入成功

## 14.2 产品使用指标

- `list` 使用率
- `doctor` 触发率与成功率
- adapter 执行成功率
- 浏览器命令成功率
- 插件安装成功率

## 14.3 生态指标

- 新增 adapter 平均开发时长
- 插件数量
- 私有 adapters 数量
- regression bug 数量趋势

---

## 15. 版本规划

## v0.1 内核版

- CLI 主框架
- registry
- discovery
- execution
- output
- errors
- YAML / TS adapter
- `list` / `validate` / `verify`

## v0.2 浏览器版

- daemon
- extension
- browser page 抽象
- `doctor`
- 第一个 browser adapter

## v0.3 扩展版

- 用户目录扩展
- 本地插件
- 外部 CLI passthrough
- 更多 adapter 示例

## v0.4 桌面与 AI 版

- Electron adapter 基线
- `record` / `explore` 原型
- AI 更友好的命令发现与输出

## v1.0 平台版

- 插件安装与升级增强
- manifest 优化
- 更强测试体系
- 私有功能正式接入

---

## 16. 技术依赖与前置条件

- Node.js 20+
- TypeScript
- Commander
- js-yaml
- undici
- Vitest
- Chrome / Chromium
- 浏览器扩展机制
- Electron 应用需支持 CDP

---

## 17. 风险与应对

## 17.1 技术风险

- 浏览器 bridge 不稳定
- extension 权限或兼容性问题
- Electron 应用无法稳定暴露 CDP
- 站点 DOM 高频变化导致 adapter 易失效

应对：

- 先做最小链路
- 每阶段只保留少量示范 adapter
- 对关键 adapter 建 regression test

## 17.2 范围风险

- 过早追求大生态
- 过早做复杂 AI 自动生成链路

应对：

- 严格区分 MVP 与后续版本
- 先做平台稳定性，再扩命令数量

## 17.3 维护风险

- adapter 数量增长后维护成本快速上升
- 插件和宿主版本兼容变复杂

应对：

- 建立统一 schema、validate、verify
- 强制 regression test 文化

---

## 18. 开放问题

当前仍需进一步决策的问题：

1. 是否在 MVP 阶段同步落地 logo、CLI banner 与 extension 命名
2. 第一阶段是否直接支持 GitHub 插件安装
3. 是否在 MVP 就支持外部 CLI 自动安装
4. 私有功能是走私有插件仓库，还是直接内置
5. 是否在早期就引入权限确认模型
6. AI 相关能力是先做 `operate`，还是先做 `record/explore`

---

## 19. 最终结论

`OctoCLI` 的本质不是一个“很多命令的仓库”，而是一个统一的网站/桌面/CLI 自动化平台。

MVP 阶段最重要的不是命令数量，而是这四件事：

1. 统一命令模型
2. 稳定执行引擎
3. 浏览器登录态复用链路
4. 可扩展的 adapter / plugin 机制

只要这四件事成立，后续无论是扩站点、接私有系统，还是供 AI agent 使用，都会进入正向积累。
