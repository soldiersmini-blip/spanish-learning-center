# LinArchive 生图指挥台

**版本：v0.3.0-alpha.1（源码预览，非正式版）**

这是本地 Node 工作台、网页界面和 Windows WebView2 客户端的源码快照。当前版本用于查看和继续开发，**不能从本仓库单独安装或启动完整产图流程**。它没有包含 LinArchive 私有工程里的词库、提示词、审核和生产门禁适配器，也没有包含本机凭证、任务账本、生成图片或编译后的程序。

## 目录

- `server.cjs`、`lib/`、`ui/`：本地服务、计划与执行逻辑、工作台界面。
- `client/`：Windows WinForms/WebView2 客户端源码。该组件现有程序集版本为 1.7；仓库整体版本以 `VERSION` 和 `package.json` 为准。
- `assets/`：应用图标源码资源。
- `scripts/check-syntax.cjs`：只做 JavaScript 语法检查，不连接服务、不生成图片。

## 本次预览的限制

`server.cjs` 和多个 `lib/` 模块依赖 LinArchive 公司工程中的词库统计、提示词、派单与质量门禁脚本。`deployment.json` 必须由使用者在本地提供绝对路径，仓库只提供 `deployment.example.json`。Windows 客户端的构建脚本会生成绑定当前机器工作台、Node 和用户数据位置的 `ClientPaths.g.cs`；此生成文件不在仓库中。客户端构建还需要本机的 .NET Framework 4.8 编译器及官方 WebView2 SDK。没有这些私有适配器和本机配置时，请勿运行真实产图入口。

执行节点不会因打开界面或连接线而自动启动。API 路径需要用户自己的 Key，目前最多两张图片同时请求；结果仅为待独立审核，不会自动归档。Pro 路径依赖本机已登录的 Codex 与另行配置的有限许可。云端指挥台和本地任务来源不同。现有质量小样不能代表稳定良品率或产能，跨机器安装尚未验收。

## 安全边界

请勿提交 `deployment.json`、`UserData/`、`runtime/`、图片、词库、生产回执、浏览器 profile、API Key 或 token。此仓库没有附带任何生产许可，也不会因下载或查看源码而恢复生图任务。

## 检查

在 Node.js 22.13 或更新版本下运行 `npm run check`，仅检查仓库内 JavaScript 源码语法。当前版本**没有通过空白环境的完整启动或产图验收**；后续正式预发布需将私有依赖改为可注入适配器，并使用无隐私 fixture 验证。
