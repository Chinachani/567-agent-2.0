# 567 Agent 2.0

这是 567 Agent 2.0 的客户端开发仓库，基于 1.x 的 **v1.2.13 / ed86395fb** 建立，保留已有提交历史。1.x 继续在 [567-agent](https://github.com/Chinachani/567-agent) 独立维护。

2.0 的官方模型通道计划使用 LiteLLM，账号、订阅与按量账本由独立业务服务负责；用户自定义 API（包括独立运营的 NewAPI）由用户自行配置与结算。当前处于开发初期，官方业务接入与旧配置迁移尚未完成，没有发布可供日常替换 1.x 的 2.0 正式版。

## 当前进度

已同步 1.2.13 的手机上下文管理、断网任务恢复、命令资源保护、运行时修复及 Markdown 改进。首批改造包括独立开发数据目录、Android 包身份、更新源隔离，以及 cloud IPC 在页面加载前注册和退出清理。完整状态见[实施进度](docs/desktop/litellm-2.0-progress.md)。

开发环境默认将 Home、Agent 配置、Electron userData、Action RPC 和 Windows 更新缓存放在 `~/.567agent-v2-dev` 下，拒绝复用 1.x 目录和越界路径。项目内配置目录使用 `.567agent-v2-*`；请使用隔离项目副本进行开发，不在真实项目上验证可写迁移。

```bash
bun install --frozen-lockfile
bun run dev:v2:config  # 只显示目录与端口，不启动应用
bun run dev:v2         # 用户需要时启动桌面开发环境，默认端口 3022
```

当前预览构建（包括本地打包预览）强制采用 2.0 开发数据目录；生产数据迁移入口完成前不提供复用正式数据的启动方式。开发启动器暂时关闭官方云功能；新业务地址合同落地后再启用。

Android 测试包为 `com.api567.agent.v2.test`，不覆盖 `com.api567.agent` 或 `.test`。见[手机开发说明](apps/mobile/README.md)。

方案文档：[开工计划](docs/desktop/litellm-2.0-preflight.md)、[工程计划](docs/desktop/litellm-2.0-engineering-plan.md)、[接口草案](docs/desktop/litellm-2.0-contract-draft.md)。

## 1.x 历史功能参考

以下保留原客户端的功能和开发说明，仅用于核对继承能力；账号与官方服务语义将随 2.0 改造更新。

## v1.2.12 主要更新

- **更新下载来源**：桌面端可选择 GitHub 官方源或可选的 GitHub 加速代理，保存后重启生效。默认仍使用 GitHub。
- **处理总耗时**：电脑和手机在回复结束后继续显示本次处理时长，重新打开会话仍可查看新记录的耗时。
- **风格库封面**：按可见区域加载，支持备用源和本机缓存；下载失败后再次打开可以重试。风格库顶部显示风格数量。
- **模型与账号界面**：移除前往 567 API 网站的操作入口，应用内账号与充值继续使用；本地自定义供应商列表隐藏应用托管的 567 API 条目。

详细记录见 [v1.2.12 发布说明](.github/release-notes/v1.2.12.md)。本次更新属于 1.x 延伸，LiteLLM 后端升级另见 [2.0 可行性评估](docs/desktop/litellm-2.0-assessment.md)。

## v1.2.5 功能回顾

- **独立设计风格库**：[567 Agent Style Library](https://github.com/Chinachani/567-agent-style-library) 汇总两路上游设计目录。初始快照包含 173 套设计体系和 148 个镜像封面；应用使用统一目录，并保留离线缓存。
- **目标模式**：桌面 Agent 可围绕明确目标持续推进，在完成、受阻或用户暂停时更新状态；目标状态绑定会话，应用重启后保持暂停，等待用户恢复。
- **富媒体 Markdown**：支持 LaTeX、Mermaid、图片预览，以及隔离的 SVG/HTML 预览；网页图片由主进程安全读取，并支持网站图标和 `data:image` 图片。
- **Android 体验**：生成图片以自适应大卡片呈现，可全屏手势缩放；聊天附件支持 JPEG/PNG/WebP 图片和常见文本、配置、代码文件，并提示格式与大小限制；新增拍照权限处理和跨会话错误隔离，并修复局域网 WebSocket 连接。
- **桌面会话管理与迁移**：手机可查看桌面默认会话和项目工作区会话；桌面侧栏项目分组支持批量选择、加密导出和删除。手机局域网备份导入失败时会显示具体错误位置与原因。
- **配置变量命名**：应用构建与运行变量使用 `AGENT567_*`，API 地址使用 `API567_BASE_URL`；旧 `VETTA_*` 环境变量不再作为配置读取。自建发布工作流需按[发布手册](docs/release/desktop-release-runbook.md)迁移变量和密钥。

完整变更见 [v1.2.5 发布说明](.github/release-notes/v1.2.5.md)。

## 获取应用

正式版本和各平台文件发布在 [GitHub Releases](https://github.com/Chinachani/567-agent/releases)。请以每个版本页面列出的文件和发布说明为准。

当前 Release 页面会列出对应版本和平台的可用文件。桌面端发布格式包括 Windows 安装程序、MSI 与便携 ZIP，以及 Linux AppImage、DEB 和 RPM；Android 版本以 Release 页面列出的 APK 为准。

Android 用户如因签名更换而无法覆盖安装，可先导出旧版聊天记录，再卸载旧版并安装新版，最后导入记录。操作步骤见[聊天记录迁移指南](docs/apps/mobile/chat-history-migration.md)。

## 项目能做什么

- **桌面 Agent 工作区**：在项目目录中与 Agent 协作，使用模型、工具和本机文件完成编码及其他工作任务。
- **本机能力与扩展**：项目包含命令和文件工具、MCP、知识库、技能、插件、主题、批量任务及相关运行时模块。具体能力取决于应用构建和配置。
- **能力市场筛选与 MCP 风险提示**：支持按类型、分类、审核状态和标签组合筛选。尚未人工核验的 MCP 添加前会显示风险说明，并提供供用户复制给 AI 的评估提示词；客户端不会自动发送提示词或安装 MCP。项目文档链接只取该 MCP 条目的文档元数据；缺失的作者、许可或文档信息会明确标为未提供，不用市场目录仓库地址代替。风险提示使用 Markdown 标记，表格会为过长字段提供换行。
- **Android 客户端**：通过 567 API 在手机上直接聊天，或连接桌面端继续会话；支持配对后的桌面远程预览与控制。
- **IM 网关**：桌面端可托管 Go 编写的网关，将已配置的即时通讯渠道接入本机 Agent。渠道支持情况和配置要求见 [IM 网关说明](apps/im-gateway/README.md)。
- **本地会话数据**：桌面会话与配置保存在本机；IM 会话可与桌面会话共享。网络请求仍会发送到所配置的模型、567 API 或已启用的集成服务。

手机端登录、模型连接和网络问题可参考[手机端连接与模型排障](docs/apps/mobile/chat-connection-troubleshooting.md)。

## 从源码运行

仓库使用 Bun 管理 TypeScript monorepo，Android 应用使用 Kotlin Multiplatform，IM 网关使用 Go。开发桌面端需要 Bun 1.3+ 和 Node.js 20+：

```bash
bun install
cd apps/desktop
bun run dev
```

本仓库桌面开发环境使用独立的 `~/.567agent-v2-dev` 配置目录。仓库根目录的 `bun run dev` 只启动部分核心包的开发监听，不会启动 Electron 桌面应用。

Android 开发和 APK 签名配置见 [`apps/mobile/README.md`](apps/mobile/README.md)；完整开发入口见[快速开始](QUICKSTART.zh-CN.md)。

## 仓库结构

本仓库是客户端开源仓库，不包含 567 API 的服务端、管理后台或官网。主要目录如下：

| 路径 | 内容 |
| --- | --- |
| [`apps/desktop`](apps/desktop) | Electron 桌面应用 |
| [`apps/mobile`](apps/mobile) | Kotlin Multiplatform Android 客户端 |
| [`apps/cli-host`](apps/cli-host) | Coding Agent 命令行宿主 |
| [`apps/im-gateway`](apps/im-gateway) | Go 即时通讯网关 |
| [`apps/docs-site`](apps/docs-site) | 项目文档站源码 |
| [`packages/ai`](packages/ai)、[`packages/agent`](packages/agent) | 模型协议与 Agent 核心循环 |
| [`packages/coding-agent`](packages/coding-agent)、`packages/runtime-*` | 产品能力组合与运行时模块 |
| [`packages/plugins`](packages/plugins)、[`packages/themes`](packages/themes) | 插件、预置扩展和主题 |

架构决策记录位于 [`docs/adr`](docs/adr)，贡献指南见 [`CONTRIBUTING.zh-CN.md`](CONTRIBUTING.zh-CN.md)。

## 参与开发

常用检查命令：

```bash
bun run check:quick             # 检查指定改动或当前工作区
bun run check                   # lint、类型检查和架构守卫
bun run test:pkg <包名>         # 运行指定包的测试
bun run test:changed -- <文件>  # 运行与改动相关的测试
```

请使用仓库脚本运行测试，不要在 monorepo 根目录执行裸 `bun test`。完整贡献约定见 [`CONTRIBUTING.zh-CN.md`](CONTRIBUTING.zh-CN.md)。

## 安全与数据

提交漏洞前请阅读 [`SECURITY.md`](SECURITY.md)，不要在公开 Issue 中披露可利用的安全细节。第三方组件与版权信息见 [`NOTICE`](NOTICE)，项目使用的开源许可见 [`LICENSE`](LICENSE)。
