# 567 Agent 2.0 开工复核与执行顺序

> 2026-10-15：已在独立 2.0 仓库开始实施，源码基线同步至 v1.2.13（`ed86395fb`）；以下保留最初审查基线，当前完成项与未完成项以[实施进度](litellm-2.0-progress.md)为准。

复核日期：2026-10-13。

## 基线与隔离

- 1.x 基线提交：`21d09bd9ff1709ef4e0b639d8948ecb812dd07e4`（1.2.12）。
- 本地备份引用：`backup/pre-litellm-2.0-20261013-185547`。
- 2.0 开发分支：`feat/litellm-2.0`，使用独立 Git 工作树。
- 备份包含 Git 历史、当前工作区源码、未提交方案文档和仓库内本地配置。依赖缓存和可重建安装包未收入源码压缩包，原 1.x 工作区及安装包继续保留。
- 2.0 的源码、依赖安装和构建在独立工作树执行，不把 2.0 配置写回 1.x，不复用 1.x 的可写依赖目录。开发运行也要采用独立数据目录，不能自动迁移用户当前正在使用的数据。
- 当前仅建立开发基线和实施方案；后端部署、服务器地址与套餐价格尚未配置。

本计划已纳入 2026-10-13 审查建议，并按源码和官方文档纠正其中的实现假定。详细边界、迁移状态机、UI 入口和测试矩阵见[工程补充计划](litellm-2.0-engineering-plan.md)，双端与后端的候选合同见[接口合同草案](litellm-2.0-contract-draft.md)。这些是待实施要求，不代表后端或客户端已具备相应能力。

## 原生 cloud 模块的复用路线

桌面优先扩展 `apps/desktop/src/main/cloud/`，沿用 `cloud-bridge.ts` 的宿主边界、主进程刷新单飞、唤醒续期、凭证同步与 Runtime 热重载机制。新的账号和订阅接入集中在这条链路，不再另建一套并行鉴权 IPC。替代数据源、迁移和回归覆盖就绪后，移除 NewAPI 的官方自动接入路径；用户自定义 NewAPI 保留。

这套模块在 `AGENT567_CLOUD_ENABLED=true` 时已经注册，并非完全未启用。源码尚未提供 2.0 的登录、订单、按量账本和严格额度核销后端；旧刷新错误码目前用于日志说明，三种 401 均归入 `unauthorized`。因此复用客户端机制不能代替独立业务服务建设，也不能据此承诺改动量减少 60%。旧 `/auth/refresh`、`/subscription/me` 与模型目录可由业务服务提供兼容端点，或在 cloud 内部适配新 DTO；最终路由和版本需由双端与后端合同确定。

本轮新增四项开工要求：

- 在加载 Renderer 之前完成 cloud IPC、Bridge 或无官方服务降级处理器的注册；注册不等待远端登录或目录查询。当前 `loadMainWindow()` 确实早于动态 cloud 导入。缺少处理器可能立即拒绝，不应描述为必然死锁；处理器内网络请求仍需覆盖读完响应体的超时、取消和失败降级。
- 复用刷新和热重载时增加账号代次校验。注销、切换账号后，旧刷新、目录及订阅响应不能恢复旧凭证或覆盖新账号状态；退出时清理 hooks 和 Bridge。旧通用网关的业务 JSON envelope 与 LiteLLM 流式模型接口分别适配。
- 推理参数、响应字段和多轮工具所需的签名信息分别验证。`thinkingFormat` 控制出站参数，不证明响应兼容；`drop_params` 不能当作保留推理功能的开关。官方模型不一律改成同一种协议，采用网关实际支持并验证过的端点。
- KMP 在 `AppContainer` 统一管理业务、官方模型和自定义连接的生命周期与在途任务。按变更范围替换连接，建立新连接失败时不留下已关闭的旧引用；官方注销不关闭无关自定义会话，共用引擎按实际所有权释放。

已移除的旧 OAuth/网页登录不因复用 cloud 恢复。2.0 登录方式仍按实际业务服务能力确定。

## 复核确认的改造点

| 位置 | 当前约束 | 首批处理 |
| --- | --- | --- |
| `apps/desktop/src/renderer/domains/api567/components/Api567AuthGate.tsx` | 整个工作区被 NewAPI 登录状态阻挡 | 区分软件工作区访问与官方模型授权；用户可配置和使用自定义 API、查看与导出本地数据 |
| `apps/desktop/src/main/567api/newapi-service.ts` | 自动接入 NewAPI 账号、余额、分组和模型令牌，固定地址 | 原生 cloud 对接独立业务服务；替代入口就绪后移除自动启动和同步，保留旧配置迁移提示 |
| `apps/desktop/src/main/567api/ipc.ts` | 账号、充值、模型分组混在一组 IPC 中 | 官方账号、权益和目录扩展原生 cloud IPC；自定义供应商不走此鉴权链路 |
| `apps/desktop/src/main/cloud/index.ts`、`apps/desktop/src/main/cloud/auth-session.ts` | 已有刷新单飞、订阅查询、唤醒 hooks 和凭证热重载，但没有完整 2.0 业务接口 | 复用并升级合同、账号代次、超时及清理；保持宿主经 Bridge 调用 |
| `apps/desktop/src/main/main.ts`、`apps/desktop/src/main/renderer-startup.ts` | 先加载 Renderer，再注册 cloud IPC；现有启动辅助只保证缓存清理顺序 | 将 IPC/Bridge 注册纳入页面加载前的准备；远端不可达不阻挡工作区 |
| `apps/desktop/src/main/media-generation/567api-image-provider.ts` | 官方生图依赖 NewAPI 服务 | 依据模型能力和端点调用 LiteLLM，继续使用当前本地图片落盘机制 |
| `apps/desktop/src/renderer/domains/settings/components/useModelsSettingsModel.ts` | 按域名与品牌名称隐藏供应商 | 只识别应用托管来源，允许用户手动添加 `api.567.wiki` 或其他自定义 API |
| `apps/mobile/shared/src/commonMain/kotlin/org/agent567/android/app/AppContainer.kt` | 聚合客户端拥有两个 HttpClient；当前重建先关闭旧客户端 | 业务与模型职责分开，由容器统一管理替换、任务取消和释放；区分官方、自定义及远程电脑 |
| `apps/mobile/shared/src/commonMain/kotlin/org/agent567/android/core/Agent567Config.kt` | 从同一地址派生业务与模型 URL | 两种地址分别配置；自定义供应商使用自身地址，不受官方登录影响 |
| `apps/mobile/shared/src/commonMain/kotlin/org/agent567/android/core/AuthRepository.kt` | 基于 NewAPI 的账号令牌和刷新逻辑 | 官方业务会话单独存储；注销不能清除用户自己的 API Key |
| `apps/mobile/shared/src/commonMain/kotlin/org/agent567/android/core/ChatRepository.kt` | 聊天和生图通过 NewAPI 分组选择 | 新模型配置明确声明来源、密钥引用与能力，避免把分组名当作能力判断 |
| `apps/mobile/shared/src/commonMain/kotlin/org/agent567/android/ui/AppViewModel.kt` | 手机直接对话先检查官方 accessToken | 先确定会话选用的供应商；自定义通道不检查官方订阅账号令牌 |
| `apps/desktop/scripts/desktop-build-environment.mjs`、`apps/desktop/vite.main.config.ts`、`scripts/release-windows.mjs` | 构建校验与环境注入依赖单一 `API567_BASE_URL` | 固化业务和网关两个地址，联动构建、打包、缓存和工作流测试；1.x 配置不在本分支之外改动 |
| `apps/desktop/scripts/run-dev-electron.mjs`、`packages/action-rpc/src/endpoint-file.ts` | 已有开发目录隔离，但两版开发可能共享目录；配置目录名也影响项目内目录 | 2.0 独立配置、Electron userData、会话与项目目录，核对所有启动方式和子进程 |
| `apps/desktop/src/main/cloud/auth/credential-store.ts` | 旧 cloud 认证会话向 `auth.json` 写入业务地址与 Access Token；与 NewAPI 会话并非同一存储 | 新业务认证与 LiteLLM Key 分开；核对 MCP 与能力发布消费者的版本、受众及刷新语义 |
| `packages/coding-agent/src/models/remote/remote-model-source.ts` | 旧远端模型源读取 `/providers/models.json`，要求产品模型元数据 | 业务服务提供富目录与权限，LiteLLM 负责推理；官方目录不允许客户端绕过网关直连上游 |
| `packages/plugins/presets/content-creation/src/generation/newapi-video-provider.ts` | 当前注册为 `custom-video`，使用用户自定义地址和 Key | 保留用户通道；官方视频按选定 LiteLLM 版本和渠道能力适配，不因类名删除已有功能 |
| `apps/desktop/src/renderer/domains/settings/components/useSubscriptionCardsModel.ts` | 已有周期额度、倒计时与刷新组件，但包含旧 provider 特例 | 复用呈现与工具函数，替换业务数据源和权限逻辑，补充按量余额与兜底状态 |
| `apps/mobile/shared/src/commonMain/kotlin/org/agent567/android/core/api/DtoMappers.kt` | `quota / 500000` 被折算为美元，旧订阅状态由 NewAPI 余额模拟 | 新业务 DTO 显式规定额度单位、货币和精度，删除旧换算；网关 DTO 不承载账号数据 |

## 已确定的实施边界

- NewAPI 保持独立运营；2.0 官方通道只使用 LiteLLM。
- 官方通道同时支持分档订阅和按量计费。套餐决定额度、限速与模型范围。
- 只有用户预先开启自动兜底，套餐额度耗尽后才转按量计费；默认关闭。
- 用户自定义 API 由用户与供应商结算。官方账号状态和套餐限制不能参与其收费、模型权限或速率控制。
- 旧网关余额不会自动搬入软件订阅或按量账本。旧会话、项目文件、图片、附件、工具记录和用户自己建立的供应商配置保持可读。
- 远程控制、IM、MCP、Skills 与本机工具仍由原有运行时负责。官方模型目录更新后，需要验证它们读取模型配置与密钥的方式，没有必要重新设计远控协议。

## 执行顺序

0. **先落实开发与构建隔离**：锁定 2.0 数据目录和 Electron userData，核对项目内配置与 IM/CLI 子进程；Android 使用独立测试包身份。固化新构建变量和候选接口合同，禁止把新地址静默当成旧 NewAPI 地址；安排 cloud IPC 在 Renderer 加载前注册。
1. **解耦双端连接与鉴权**：建立明确的官方和自定义供应商来源，独立业务地址与网关地址，分离账号会话与模型密钥；去除自定义通道对 NewAPI 登录的依赖。KMP 业务、网关、SSE 与媒体处理分别归属，连接与任务由容器统一管理。
2. **扩展原生 cloud 并固化后端合同**：复用刷新、订阅、Bridge、凭证同步和 Runtime 热重载，补齐登录、目录、按量账户、兜底及请求状态合同；明确旧端点兼容和账号代次。具体价格和限额由服务端配置，不恢复没有后端支持的 OAuth。
3. **接入 LiteLLM 与独立业务服务**：服务端签发受限模型访问密钥，校验套餐和计费来源。每个真实模型操作独立关联调用与核销；自动传输重试复用该操作身份，用户新尝试另建身份。逐模型验证推理参数、思考块与工具循环。
4. **更新账号、模型与使用量界面**：复用已有订阅卡片、倒计时和刷新组件；清点页头、侧栏、模型配置、消息终态刷新和手机个人中心，显示订阅额度、有效期、模型范围、限速，以及独立的按量余额；兜底状态和本次计费来源可见。
5. **实现升级提示与数据兼容**：原托管 NewAPI 配置由用户决定是否转为自定义供应商；不默默更换历史会话的模型，也不在启动时自动使用旧凭证。
6. **最后完成两端构建和实机验收**：在隔离数据目录及测试账号下验证，再安排 2.0 发布。1.x 的发布仍由其他代理维护。

## 必须覆盖的验收场景

- 未登录官方账号，仍可配置和使用自定义 API，包括独立 567 API；官方注销、过期和额度不足不影响该通道。
- 套餐有额度、额度不足且兜底关闭、额度不足且兜底开启、主动按量四种路径均有准确提示；模型和限速按实际通道校验。
- 多个窗口和手机同时发送时，不重复核销套餐或按量账本；生图超时、重试与取消不重复提交收费任务。
- 软件账号、LiteLLM Key 和用户自定义 Key 不混用，日志及 renderer 不接触管理密钥。
- 远控、IM、新会话默认模型和旧会话续聊遵循选定供应商；断网和服务端故障有明确错误，不静默切换付费通道。
- 手机图片、文件与生图结果保留现有本地存储、传输和迁移机制，SSE、工具调用和 usage 边界继续执行已有回归用例。
- 商业和无官方服务两种构建均完成页面加载前的 IPC 注册；服务慢、响应体挂起、注销中刷新和反复初始化不导致白屏、凭证恢复或 hooks 泄漏。
- 业务/网关地址切换和官方注销只影响所属连接与请求；旧 KMP 响应不串账号或会话，引擎创建失败及容器释放都可验证。
- 含推理的多轮工具调用保留必要的 reasoning 字段、签名与回放信息；不以丢弃推理参数规避协议错误。
- 回退时可重新使用 1.x 工作区和其数据，不依赖 2.0 已变更的配置文件。

## 进入真实后端联调前的信息

- 独立业务服务的负责方和代码位置；官方业务域名、LiteLLM 网关地址及测试账号。
- 套餐额度单位和周期、具体速率与模型范围、按量价格和支付方式、兜底消费上限。
- 旧 NewAPI 用户的软件订阅优惠或兑换规则（如需要），以及旧 1.x 自动接入的兼容期限。

上述信息不影响开始客户端解耦与接口合同工作，但在未确定前不会假设生产地址、扣费规则或迁移余额。

## 审查后的关键修正

- 桌面 OpenAI 请求层已有可配置的 `include_usage`；手机要补请求和末尾纯 usage 事件的完整链路。自定义端点不支持该参数时保留兼容配置。
- `X-Request-Id` 是关联手段，不会自动建立网关幂等或取消结算。一次 Agent 回合中的每次模型调用、预测、命名和生图分别持有请求身份，传输重试才复用原操作 ID。
- 视频插件当前是用户自定义通道；LiteLLM 官方文档也已有视频 API。具体适配取决于版本和供应商，不预先把视频删除或降级。
- 当前默认模型在 `agent/models.json` 中维护，凭证可能是保险库引用；迁移不能仅按 provider 名称匹配、复制明文 Key 或重写历史消息。
- 回退覆盖数据、密钥、模型选择和正在结算的请求。未知字段兼容不等于双向兼容，“五分钟回退”只能作为演练目标，不能当作未验证保证。
- 第二轮审查的原生 cloud 复用方向采纳；“完整后端已具备”“精确业务码分支已实现”“改动量减少 60%”和“开启 drop_params 即可解决推理兼容”没有相应证据，不作为实施前提。
