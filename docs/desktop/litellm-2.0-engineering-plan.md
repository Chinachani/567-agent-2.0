# LiteLLM 2.0 工程补充计划

> 2026-10-15：已在独立 2.0 仓库开始实施，源码基线同步至 v1.2.13（`ed86395fb`）；以下保留最初审查基线，当前完成项与未完成项以[实施进度](litellm-2.0-progress.md)为准。

日期：2026-10-13。基线为 `21d09bd9f`。本文件整理审查采纳结果与实施验收要求；所有开发在 `feat/litellm-2.0` 独立工作树进行。当前没有切换生产服务。

## 审查结论与事实修正

| 审查建议 | 源码或文档核实 | 采用方式 |
| --- | --- | --- |
| 单地址构建合同需要拆分 | 构建验证、Vite 主进程注入和 Windows 发布脚本均读取 `API567_BASE_URL` | 纳入 Phase 0，新增两个明确地址并同步全部生产者和消费者 |
| Turbo 缓存只识别旧变量 | 当前 `turbo.json` 已有 `API567_*` 和 `AGENT567_*` 通配规则 | 保留正确规则，验证新变量改变会使相关缓存失效，不机械添加重复配置 |
| `auth.json` 要区分 Token | 文件由旧 cloud `auth-session.ts` 同步，NewAPI 服务另有会话存储 | 核对两条旧认证链路；业务认证、工具授权、模型 Key 分开，不互相替代 |
| 需要富模型目录 | 旧模型源校验产品 Schema，不是简单的 OpenAI 模型 ID 数组 | 由独立业务服务提供有版本的目录，网关响应作为渠道能力核验来源 |
| 视频强绑官方且 LiteLLM 无视频 | 当前插件注册为 `custom-video`；LiteLLM 已有 `/videos` 文档 | 保留自定义通道；官方视频按选定版本和渠道能力接入 |
| 开发启动默认总是读正式数据 | 开发启动脚本已默认 `.567agent-dev`；该目录仍可能与 1.x 开发版共享 | 使用 2.0 独立目录，并核对直接启动、CLI、IM 和 Windows 路径覆盖 |
| 双端都必须新增 `include_usage` | 桌面 `request.ts` 已按兼容性配置发送；手机请求目前未携带 | 保持桌面兼容能力，补手机请求与纯 usage 事件处理 |
| 一个回合的取消和重试共享一个 ID | 工具循环包含多个正常的收费模型调用；HTTP 中止不代表上游已取消 | 区分回合、逻辑操作和传输尝试，服务端落实幂等及核销 |
| 旧配置有 `source: managed`，默认模型在桌面偏好中 | 当前桌面 Provider 类型只声明可选 `template` 来源；模型默认值在 `agent/models.json` | 新增明确所有权，不根据虚构字段或域名自动删除用户条目 |
| 生图统一强制 Base64 与固定尺寸 | 参数支持随模型变化；现有 ArtifactStore 标记 `lifetime: temporary` | 按能力选择参数，区分临时产物与会话永久附件 |
| Android 图片位于私有外部目录 | 当前实现使用 `filesDir/chat-images` | 延续实际私有存储与原子写入，不改成易被清理的缓存目录 |
| 激活原生 cloud 即完成 2.0 后端 | 商业构建已注册该模块；现有能力是客户端刷新、查询、凭证同步与 Bridge | 扩展该模块，避免并行鉴权体系；独立业务服务仍需实现新商业规则 |
| 40105/40106/40107 已精确处理 | 当前仅在拒绝日志中保留 code/message，返回统一 `unauthorized` | 保留三态刷新语义，补结构化错误及账号代次，不宣称已有独立处理分支 |
| cloud 初始化晚必然导致 IPC 挂死 | `loadMainWindow()` 先启动；cloud 注册在后，存在竞态；缺处理器也可能直接拒绝 | 注册完成后再加载页面，网络查询不参与窗口启动门禁 |
| `thinkingFormat` 与 `drop_params` 能保证思考映射 | 前者影响出站参数，后者会丢弃不支持参数；当前 OpenAI 转换器没有专门的 `thinking_blocks` 回放链路 | 按模型合同适配响应与回放，不能通过参数丢弃承诺完整推理支持 |
| 拆为双 Client 后地址变更或注销都应一起关闭 | 现有 `Agent567Client.close()` 已关闭自身两个 HttpClient；拆分后的连接所有者不同 | 统一生命周期管理但按所有者替换；官方注销不打断无关自定义请求 |

LiteLLM 的视频 API 和支持范围见[官方视频文档](https://docs.litellm.ai/docs/videos)。流式 usage 的末尾空 choices 形态见[官方 usage 文档](https://docs.litellm.ai/docs/completion/usage)。这些能力需在固定部署版本与目标渠道验证。

## 原生 cloud 复用范围与实施顺序

桌面采用扩展现有 cloud 的路线。`AGENT567_CLOUD_ENABLED=true` 时它已被挂载，不能把复用描述为简单打开一个尚未运行的模块；本仓库也没有可直接部署的原生业务后端。无需新建并行认证体系，仍需实现独立业务服务与 LiteLLM 授权和核销。

| 现有资产 | 保留与升级 |
| --- | --- |
| `apps/desktop/src/main/cloud/auth-session.ts` | 刷新单飞、暂时故障保留会话、唤醒续期、订阅和目录查询；升级地址、DTO、账号代次与响应体超时 |
| `apps/desktop/src/main/cloud/index.ts`、`apps/desktop/src/main/cloud-bridge.ts` | 唯一挂载入口和宿主依赖边界；接管清理函数，退出时注销 hooks/IPC 并清空 Bridge，防重复注册 |
| `apps/desktop/src/main/cloud/auth/credential-store.ts`、Runtime 热重载 | 复用通知与消费者适配机制；新工具授权和模型 Key 按各自受众传递，不盲目把旧业务 Token 当作 LiteLLM Key |
| `apps/desktop/src/renderer/cloud/auth/hooks/useAuth.ts` | 复用账号生命周期与权益刷新入口；只保留当前账号的结果，调整 Renderer Token 引导和旧 SSE 服务依赖 |
| `apps/desktop/src/main/cloud/gateway.ts` | 复用业务 JSON 请求的认证与取消边界；其旧 envelope、地址和非流式读法不能直接充当 LiteLLM SSE 客户端 |

在 cloud 内部使用一个确定版本的业务适配层，将旧 `/auth/refresh`、`/subscription/me`、`/providers/models.json` 与新账号、权益和目录 DTO 对齐。服务端实现兼容端点或客户端集中映射均可，不同时维护两套凭证事实源，不让宿主调用方猜路由。

先完成隔离、合同和替代链路，再接通官方 UI 和模型目录；迁移与行为测试覆盖后移除 NewAPI 官方自动同步入口及无用代码。用户自定义配置和历史引用继续保留。旧 OAuth/网页登录没有后端支持，不因复用原生 UI 恢复。改动量和工期以实际依赖清单估算，不能依据代码存在就承诺减少 60%。

## Phase 0：开发与构建防护

### 数据目录

- 2.0 启动器将 `AGENT567_HOME` 展开为用户目录下 `.567agent-v2-dev` 的绝对路径；不传字面量 `~` 给不执行展开的外部脚本。
- 设置 `AGENT567_CONFIG_DIR=.567agent-v2-dev`。该变量不仅影响 Home，也影响项目内配置目录；核对项目、会话、技能和凭据的所有路径派生。
- Electron userData/sessionData 使用隔离路径；核对 `AGENT567_DESKTOP_USER_DATA_DIR`、启动参数和 Windows 数据位置覆盖。只设置应用 Home 不能证明浏览器状态已隔离。
- CLI、IM 子进程和 Action RPC 继承同一配置根；开发使用隔离项目副本、工作区与网络端口，不能复用正式会话端点或在真实项目上执行可写迁移。
- Android 2.0 测试包身份与当前正式包及 1.x 的 `.test` 包分开，避免覆盖真机数据。密钥与 Android Keystore 不按目录直接复制。
- 直接启动、调试、CLI 与隔离测试入口都要验证实际路径。误指向 1.x Home 或 userData 时拒绝进入迁移和可写运行。

### 地址合同

- `API567_SERVICE_URL`：官方业务 API 基址；`API567_GATEWAY_URL`：LiteLLM 网关基址。公开 URL 不含账户凭证或模型 Key。
- 明确每种协议的基址与相对端点拼接规则，保留合法部署路径前缀，测试重复 `/api/v2`、重复 `/v1`、尾斜杠和不同主机。
- 官方功能开启的生产构建校验两个 HTTPS 地址；仅自定义供应商的模式可以不配置官方服务。官方服务未配置不能阻挡本地数据访问和自定义通道。
- `API567_BASE_URL` 不自动同时解释成两种地址。旧消费者的兼容适配、迁移期限与冲突错误需要显式定义，不能把原 NewAPI URL 默认带入官方 2.0 通道。
- 同步 `apps/desktop/scripts/desktop-build-environment.mjs`、`apps/desktop/vite.main.config.ts`、`apps/desktop/src/main/constants.ts`、`scripts/release-windows.mjs`、`scripts/release/resolve-desktop-release-config.mjs` 和 2.0 工作流合同；核对 macOS、Linux、Android 构建注入及 CLI/IM 环境继承。
- 1.x 的全局 GitHub 变量、发布标签和生产环境不在此阶段改动。现有 `API567_*` 缓存通配继续使用，以实际构建验证变量进入产物及缓存键。

### 主进程启动与注销时序

- 当前 `main.ts` 在创建窗口并调用 `loadMainWindow()` 后才动态导入 cloud；`renderer-startup.ts` 仅保证开发缓存清理先于页面加载。2.0 将依赖就绪后的 cloud IPC/Bridge 注册放进页面加载前的准备步骤，无官方服务构建也在此时注册降级处理器。
- `startCloudMain()` 当前是同步注册函数，动态 import 是异步边界。等待本地注册完成即可，不把远端登录、刷新、订阅或模型目录请求作为显示工作区的前置条件。
- IPC 缺处理器可立即拒绝；处理器已注册但远端停滞属于另一类失败。Renderer 捕获初始化拒绝并显示可恢复状态，主进程请求采用与操作匹配的截止时间和取消信号，覆盖连接、响应体读取与解析。旧 cloud 的部分计时器在 fetch 返回后即清除，不能作为完整响应期限的保证。
- UI 超时不能只丢弃 Promise；支持取消的业务操作传递取消，迟到响应按账号/请求代次拒绝。涉及 refresh 轮换的未知结果保留待恢复状态，按服务端合同恢复，不盲目复用可能已撤销的令牌。
- 注销和换账号先使旧代次失效，再清理所属官方任务和凭证。迟到刷新不能重写凭证文件或向 Runtime 推送旧登录态；唤醒回调、订阅和模型查询遵循同一守卫。
- 初始化与 teardown 对称，Bridge 重置与 IPC/hooks 清理归入口所有者；无云构建不静态引用 cloud 内部。重复窗口和登录不重复注册处理器或续期 hooks。

## 双端网络与凭证分层

### KMP

- `OfficialBusinessApi` 拥有官方登录、刷新、订阅与账本、官方模型目录，使用业务认证会话。
- `LlmGatewayApi` 拥有模型协议请求，不生成 NewAPI 分组令牌；官方路由使用受限网关凭证，自定义路由使用用户密钥。地址、凭证、协议、能力与来源绑定为一个连接配置，不能分别从全局默认值拼凑。
- 复用并独立维护 `core/chat/OpenAiSseParser.kt`，媒体响应处理和持久化分别归属；不把解析器重新塞回不断膨胀的业务类。
- 官方与自定义聊天都脱离 `groupKeyCache`、`cleanupGroupToken`、`ensureApiKeyForGroup` 和自动注入 `X-567-Group` 的路径。用户自己明确设置的自定义请求头不是旧系统托管分组逻辑。
- `ApiDtos.kt` 和 `DtoMappers.kt` 拆分业务与网关 DTO；移除 `quota / 500000` 美元换算和由 NewAPI 余额模拟 `subscriptionMe()` 的行为。
- 保留原有 SSE 分片、正文与 finish 同帧、EOF、工具参数边界、网络取消、图片与附件限制的保护。不为通过编译而删除旧测试的有效行为覆盖。

### KMP 连接与任务所有权

现有 `core/Agent567Client.kt` 拥有带认证和 bare 两个 HttpClient，`close()` 会关闭两者；`AppContainer.recreateClient()` 先关闭旧客户端再创建新客户端。拆分后的泄漏是需要预防的设计风险，不是已经证实当前代码未调用 close。

- 容器统一持有业务会话、官方模型连接及自定义供应商连接，每个条目记录配置/账号代次和所属在途任务。Repository/Flow 不长期捕获已过期客户端。
- 地址或账号变更先构造新客户端；构造失败释放已创建的部分资源并保留原连接。替换提交后使旧代次失效、取消或按明确策略排空所属任务，再关闭旧客户端；取消后的旧响应不能落盘到新账号或会话。
- 官方注销清理业务和官方模型凭证及任务；用户自定义 Key 和无关自定义流继续有效。仅改变业务地址不重建全部供应商连接，仅改变一个自定义端点不重建官方账号客户端。
- HttpClient/引擎的创建与关闭由实际所有者管理；若共享引擎，明确唯一关闭点或引用计数，不重复关闭仍被使用的资源。容器释放时关闭全部剩余客户端，配置反复切换不会累积连接池。
- 业务匿名登录/刷新、业务 Bearer、官方模型 Key 和自定义 Key 使用不同认证边界；重定向或连接复用不把一种凭证发给另一主机。

### 桌面与外部进程

- 官方账号会话、工具授权、LiteLLM 虚拟 Key、自定义 API Key 分别持有生命周期。模型 Key 和管理密钥不能写成 `auth.json` 中的通用业务 Token。
- 核对 `apps/desktop/src/main/cloud/auth/credential-store.ts`、`packages/runtime-node/src/mcp/auth/api567-credentials.ts`、`packages/skill-presets/publish-ability/scripts/auth.mjs`。旧消费者硬编码 `/api/v1`；新合同需要版本、服务基址、受众及可用作用域。
- 优先使用隔离的版本化工具授权文件或明确适配层，保留 1.x 文件用于回退。按需重读，轮换原子写入，过期拒绝，注销清除官方凭证且不触碰用户自定义 Key。
- MCP 和能力发布服务的可用性及权限是独立问题；未部署对应端点时显示未配置，不把 LiteLLM 模型 Key 发送给旧服务或任意第三方。
- 模型保险库的 `credentialRef` 延续密钥隔离；迁移使用合法的密钥存储接口，不把明文 Key 写入 Renderer、模型目录、日志或计划示例。

## 富模型目录与协议能力

- 独立业务服务提供目录版本、修订号、模型 ID/网关别名、API 协议、上下文、输出上限、输入模态、推理参数、工具支持、图片与视频端点，以及订阅和按量通道的访问范围。
- 明确对接 `packages/coding-agent/src/models/remote/remote-model-source.ts` 和模型 Schema。现有 128k 默认上下文不能替代真实能力；未知字段显示未知或受限，不擅自宣称视觉和工具可用。
- 官方目录只允许模型请求进入配置的 LiteLLM 网关，不接受能绕过计费的 `upstreamBaseUrl`。模型目录与 UI 快照不含 Key。
- 桌面保留现有多协议适配器；手机首批 OpenAI 兼容能力要在 UI 明确，不能把自定义 Anthropic/Gemini 端点默认为同一协议。
- 目录失效、下线和套餐变化不破坏历史读取；发送前按当前服务端权益校验，不能只相信旧目录缓存。

### 推理字段与工具循环

- `packages/ai/src/providers/openai-completions/request.ts` 的 `thinkingFormat` 选择出站 `reasoning_effort`、`thinking` 或模型专有参数。名称为 DeepSeek 的模型经 LiteLLM 访问时，不能直接据名称套用直连 DeepSeek 的参数。
- `adapter.ts` 已识别 `reasoning_content`、`reasoning`、`reasoning_text`，并用 `ThinkingTagSplitter` 处理分片标签；`messages.ts` 会重传部分 reasoning 信息。这些现有能力保留，但不证明 LiteLLM 的全部额外字段已纳入 Schema、持久化与回放。
- 官方目录明确 API 协议、受支持推理参数和级别、响应字段、签名/不透明块及回放要求。首批 OpenAI 兼容路由按真实合同映射；需要原生 Anthropic/Responses 语义时使用 LiteLLM 支持的对应端点，仍经过官方授权和计费。
- Claude 含推理的工具循环要验证 `thinking_blocks` 等原始信息从 SSE 接收、内部模型、JSONL 到下一请求的完整路径；缺失时不能宣称支持这一组合。签名不当普通正文展示，也不改写成标签文本代替回放。
- `drop_params` 会移除不支持的参数；`modify_params` 的部分兼容行为也可能关闭某轮推理。官方配置不全局静默启用这些行为来绕过错误；仅对已明确且验证过的兼容规则使用，并使目录与 UI 能力一致。
- 回归涵盖推理字段与正文交错、标签跨分片、工具参数分片、签名或不透明数据、第二轮工具结果回放、不同模型切换和最终 usage。未知字段兼容不能取代必要字段验证。

LiteLLM 对参数丢弃与 Anthropic 推理回放的约束见[参数文档](https://docs.litellm.ai/docs/completion/drop_params)和[推理文档](https://docs.litellm.ai/docs/reasoning_content)。固定版本与目标模型的实测结果决定最终支持范围。

## 请求生命周期、usage 与结算

- 官方 Chat Completions 流式请求声明 `stream_options.include_usage=true`；自定义端点使用其兼容性设置。其他协议按原生 usage 合同适配，不盲目添加 OpenAI 参数。
- 解析 `choices: []` 的纯 usage chunk，允许正文与 `finish_reason` 同帧、后续 usage、`[DONE]` 与合法 EOF。追加 usage 不再次完成回合、不重启 spinner、不丢正文；usage 缺失不记成零消耗或判回答失败。
- `turnId` 关联整轮 Agent；每个模型调用、标题生成、预测、上下文压缩、子代理与媒体任务分别获得 `operationId`；自动传输重试复用同一 operationId，新调用和用户发起的新尝试使用新 ID 并可关联父 ID。
- `X-Request-Id` 用作跟踪；服务端把业务 operationId、网关调用 ID 与上游 ID 建立映射。客户端 metadata 不是权威结算信息，也不证明 LiteLLM 原生支持幂等。
- 幂等记录绑定用户、调用用途、模型和请求摘要。同 ID 不同请求拒绝；相同请求在进行中或已完成时不能第二次调用模型或扣费。工具后续调用不能误用上一模型调用的幂等键。
- 业务服务或网关策略在调用前执行权益与额度预留。客户端直接持有网关 Key 时仍必须经过服务端计费策略，不能绕过预留或自行指定免收费标记。
- 套餐额度不足发生在上游调用之前，按已授权兜底规则选择一次计费通道。模型未授权、限速、认证失败或超时不是自动兜底的理由。
- `AbortSignal`、Kotlin `Job.cancel()` 与断网只证明客户端中止。保留取消请求和状态查询，收到服务端终态或完成对账后释放未消耗的预留；已有真实 usage 仍核销，未知结果进入待核对状态。
- 服务端的持久化状态、预算上限、超时回收和重启对账必须共同覆盖；不能只依赖关闭连接事件和异步回调。消费限额的周期、币种和 reset 时间明确下发。

## UI 入口清单

| 入口 | 改造与保持的行为 |
| --- | --- |
| `Api567AuthGate` | 工作区、自定义模型和远控可进入；官方功能局部提示认证与权限 |
| `PageHeader`、`SidebarBottomBar`、`Api567Button` | 统一官方账号与计费状态，不残留 NewAPI 余额语义 |
| `Api567GroupsSection` | 官方目录不再提供 NewAPI 分组接入；用户自定义配置保留 |
| `Api567TopupModal`、账号页 | 替换独立业务支付合同；支付渠道与是否使用网页结账尚待确定，不默认打开外部页面 |
| `SubscriptionCards`、`useSubscriptionCardsModel`、`subscriptionStatusAtom` | 复用布局、倒计时与刷新；清除旧 `vetta-go` 和旧模型倍率特例，扩展按量余额和兜底 |
| `useSessionEventController` | 请求来源确定后刷新对应权益；自定义通道不调用官方余额接口，轮询失败不抹状态 |
| `useImageGenerationSettingsModel` | 提供商来源与能力决定模型，保留旧模型引用的显示兼容 |
| 手机 `MeScreens`、`AuthScreens` | 登录、套餐、按量状态分开；未登录可继续自定义与远程电脑会话 |
| 手机 `ChatScreens`、`AppViewModel` | 官方/自定义/远程电脑来源清晰，发送不再静默创建旧分组 Token |
| 模型选择、预测、命名和 IM | 同样执行来源选择；不能在用户选择自定义时偷偷调用官方辅助模型 |

## 数据迁移与历史会话

候选状态为 `not_checked → needs_choice → preparing → committing → completed`，错误进入 `failed_retryable`，用户暂不处理进入 `deferred`。按配置版本与用户选择记录迁移完成状态；注销或重启不能重复弹窗或重复复制供应商。

- Desktop 当前模型配置和默认模型位于应用 Home 下 `agent/models.json`，并使用模型凭证保险库；旧 cloud `auth.json` 和 NewAPI 会话另行核对。
- 名称匹配 `567api_*` 只是线索，不能单独证明托管所有权；同域名、同品牌的用户配置保守保留。迁移界面显示拟处理条目并允许保留、暂不处理；清理是单独的显式选择。
- 保留为自定义时，保持模型、端点和必要用户配置；新 ID 不覆盖已有 ID，记录别名与迁移日志。只转移真实模型 Key，账户 Access Token/Cookie 不能冒充模型密钥，也不在后台自动生成 NewAPI Token。
- 使用安全存储 API 和暂存提交更新配置、别名、默认模型与迁移标记；中途失败回滚或可重试。失败不得删除源配置和原密钥。
- 历史 JSONL 不重写。失效 provider 显示“已停用通道（历史）”，允许用户明确选择 LiteLLM 或自己的供应商续聊；明确选择之后才记录新模型事件。
- 原有默认模型仍有效时保持；转换保留的供应商可使用明确别名。无法解析时提示选择，不自动选择第一个自定义或官方付费模型，也不把暂时离线当作需要清空默认配置。
- Android 独立测试包通过受控、加密的数据导入验证会话和附件；跨应用 Keystore 不能直接复制。暂不支持的密钥迁移提示用户重新填写。

## 生图与视频的持久化

- 按模型能力选择 `response_format`、尺寸、参考图和张数；支持时优先 Base64，URL-only 模型使用立即下载，保留生成来源与任务 ID。
- URL 下载在后台执行现有安全读取策略：限制大小和跳转，验证格式与 MIME，不将账号或模型 Authorization 转发给媒体 CDN。下载失败展示可恢复的保存错误，不能再发起一次收费生成来获取图片。
- `MediaArtifactStore` 背后的 ArtifactStore 产生临时引用，释放和 dispose 会删除文件。成功生成必须先转入有会话/任务持久所有权的附件存储，提交消息引用后再释放临时文件。
- Desktop 延用现有受限本地资源读取与媒体存储接口，不新增不受限制的 `file://` 访问。Android 延用 `filesDir/chat-images` 和原子写入。
- 无有效图片、文件为空或保存失败不能显示“生图完成”。重开会话、重启、清理临时产物、加密导出和跨项目恢复后仍应能显示输入图及生成图。
- 自定义 `custom-video` 持续可用；官方视频采用固定版本支持的任务提交、轮询、下载和取消合同，缺失渠道才评估透传。任务轮询不重复计费。

## IM、CLI 与远控影响

- `apps/desktop/src/main/im-host/coding-agent-spec.ts`、`host-protocol.ts`、`apps/im-gateway/cmd/im-gateway/host.go` 当前会传递单一 serverUrl/`API567_BASE_URL`；拆分后同步协议字段与测试，避免只改父进程环境。
- IM 子进程读取与主进程一致的模型来源和受限凭据，按明确配置使用官方或自定义。未知历史 provider 给明确提示，不自行探测 NewAPI。
- Linux/macOS `--agent-rpc` 和 Windows Node CLI 两种生产路径都需验证，包含真实子进程握手、模型元数据、工具循环和凭据轮换。
- 远程手机对话在电脑执行，由电脑选择通道并结算。手机不能把自己的官方 Key 注入电脑或同时在手机账本扣费；远程模型目录和续聊别名保持一致。

## 回归矩阵与完成标准

| 验收 | 需要保留/扩展的证据 |
| --- | --- |
| TC-201 自定义通道独立 | 未登录、注销、过期、官方故障均能发送与生图；账号、目录、余额及辅助模型的官方请求为零 |
| TC-202 SSE 与 usage | 末尾纯 usage、同帧 finish、EOF、分片工具和取消；Desktop `openai-completions-usage.test.ts` 与 KMP `OpenAiSseParserTest.kt` |
| TC-203 套餐与按量 | 套餐、兜底关、兜底开、主动按量四条路径；模型限制、消费上限与 UI 计费来源一致 |
| TC-204 幂等和取消 | 工具循环多个合法操作、自动重试、用户新尝试、断网、取消后继续上游、重启对账；只释放未消耗部分 |
| TC-205 目录与路径 | 两种 URL、缓存失效、生产构建校验、Electron userData、项目配置、CLI/IM 继承和 Android 包身份 |
| TC-206 迁移与默认模型 | 同品牌自定义条目、保险库引用、ID 冲突、暂不迁移、事务失败重试、历史已停用模型和用户明确续聊 |
| TC-207 跨进程凭据 | 登录/刷新/注销与作用域变化；MCP 和发布脚本不读错目录、不缓存旧令牌、不用模型 Key 作工具权限 |
| TC-208 媒体与恢复 | Base64 与 URL-only、保存失败、临时释放、重启、输入图/生成图导出和新项目再导出、视频轮询 |
| TC-209 辅助调用与多端 | 标题、预测、子代理、IM、远控的计费身份与凭据归属，跨会话并发不串状态 |
| TC-210 回退 | 1.x 原数据不变、2.0 数据副本可恢复、按量账本继续对账、不同系统恢复步骤可执行 |
| TC-211 原生 cloud 启动与清理 | cloud 开/关均先注册再加载页面；服务不可达、响应体挂起、重复初始化和 teardown；本地工作区持续可用 |
| TC-212 推理与工具回放 | LiteLLM 各路由的出站参数、混合 delta、签名/不透明块持久化及第二轮工具调用；不靠静默关闭推理过关 |
| TC-213 KMP 连接生命周期 | 反复切换业务/网关/自定义地址、构造失败、并发发送、注销和释放；旧代次无写入，共享引擎不提前关闭 |
| TC-214 原生刷新升级 | 并发刷新、401 业务码、暂时故障、注销/换账号时迟到响应、唤醒续期、工具和 Runtime 凭证轮换；自定义流不受影响 |

`newapi-service.test.ts`、`account-recovery-flow.test.ts`、媒体 Provider 测试、`GroupModelsHostTest.kt` 和 `Agent567ConfigTest.kt` 中仍有价值的状态隔离、刷新、重试、错误与附件用例需要迁移后再删除旧路径。不能直接删除整个旧测试文件来消除失败。

按阶段执行仓库影响测试、类型与架构门禁，再运行 Desktop 全量、Android Host Tests、Go IM 测试和合同测试。最终在隔离配置与测试账户下验证 DEB、Windows 安装包和独立 Android 测试包。当前文档核实不等于这些验收已完成。

## 回退手册要求

1. 停止新官方请求，记录尚未完成的 operationId 和订单；按请求状态保留或结算实际用量，回退版本不等于退款或取消上游。
2. 备份 2.0 的数据库、配置、附件和密钥引用；确认原 1.x 快照、安装包和签名仍可用。
3. 用原 1.x 目录和配置启动 1.x；2.0 新配置放独立位置，不能依赖“旧解析器会忽略字段”证明兼容。需要带回的会话经受控导出/导入处理。
4. NewAPI 继续作为独立网关运行；用户原账号和余额保持其原有归属，官方 2.0 账本另行完成对账。
5. Android 降级可能受版本码、签名和系统限制，使用经过验证的加密备份恢复流程；不承诺直接覆盖 APK 一定成功。
6. 若数据库或网关需要回退，核对迁移兼容性及 `LITELLM_SALT_KEY`；服务重启后验证未结算请求和重复支付回调，不清空账本来恢复服务。

回退时间是演练测量结果。“五分钟”仅作为目标，源配置、媒体和账本必须以实际恢复验证为准。
