# 西班牙语学习中心网站深度自检报告

日期：2026-06-25  
项目：Spanish Learning Center / 西班牙语学习中心  
线上地址：https://soldiersmini-blip.github.io/spanish-learning-center/

## 结论摘要

网站源码没有坏，当前工作区可以成功构建，本地服务启动后也能访问。用户经常看到“无法访问此网站 / 127.0.0.1 拒绝连接”的主要原因是本地开发服务器没有持续运行，而不是线上 GitHub Pages 下线。

线上站点首页当前正常，返回 200 OK。GitHub Pages 最近一次部署成功。真正需要优先修复的是两类问题：

1. 本地预览依赖 `127.0.0.1:5173`，只要服务窗口关闭、电脑重启、端口没启动，就会显示连接被拒绝。
2. 线上 GitHub Pages 子路径刷新会 404，例如 `/spanish-learning-center/a1`。这是 SPA 路由和 GitHub Pages 项目子路径不兼容造成的。

## 自检证据

### 可用性

- 线上首页 `https://soldiersmini-blip.github.io/spanish-learning-center/`：200 OK。
- 线上 Pages 配置：`build_type=workflow`，发布地址为 `/spanish-learning-center/`。
- 最近一次 GitHub Actions 部署：成功。
- 本地 `127.0.0.1:5173` 初始检查：未监听，访问失败。
- 启动本地 Vite 后：`http://127.0.0.1:5173/` 返回 200 OK。

### 构建状态

- `npm run build` 成功。
- 构建产物包含 `dist/index.html`、JS、CSS、favicon、manifest、icons。
- 当前构建包大小：JS 约 460 KB，CSS 约 26 KB，gzip 后 JS 约 147 KB。

### 发布状态

- 当前 GitHub 远程分支只包含首个提交：`ec65981 Deploy Spanish learning center`。
- 本地工作区存在大量未提交、未推送改动。
- 因此：本地看到的版本和线上看到的版本并不完全一致。

## 为什么经常“下线”

### 1. 本地地址不是公网网站

`127.0.0.1` 是本机地址，只能访问自己电脑上正在运行的服务。它不是线上网址。

如果本地 Vite 服务没有运行，浏览器就会显示：

`ERR_CONNECTION_REFUSED`

这不是网站代码崩溃，而是没有服务在 `5173` 或相关端口接收请求。

相关位置：

- `package.json` 第 7 行：`dev` 命令是 `vite`。
- `打开西班牙语学习中心.cmd` 第 28 行：启动本地 Vite 到 `127.0.0.1:5173`。

### 2. 本地启动服务不是常驻服务

本地开发服务依赖一个 Node/Vite 进程。它会在以下情况停止：

- 命令窗口被关掉。
- 电脑重启。
- Codex 或终端会话结束。
- 启动脚本异常退出。
- 端口被占用或服务启动失败。

这就是为什么同一个本地地址有时能打开、有时不能打开。

### 3. GitHub Pages 子路径刷新 404

首页正常，但子路径直接访问会失败：

- `/spanish-learning-center/`：正常。
- `/spanish-learning-center/a1`：404。
- `/a1`：404。

代码中存在绝对路径导航：

- `src/App.tsx` 第 65 行：`window.history.pushState({}, '', target === 'home' ? '/' : \`/${target}\`)`
- `src/App.tsx` 第 72 行：`/${level}/test?count=${count}`
- `src/App.tsx` 第 81 行：`/neural/${...}`

这些路径在本地 Vite 中通常能工作，但在 GitHub Pages 的项目站点中不稳，因为项目真实根路径是：

`/spanish-learning-center/`

### 4. PWA 和图标路径也使用了域名根路径

当前本地未发布版本里，`index.html` 和 `manifest.json` 使用了 `/favicon.ico`、`/icons/...`、`/manifest.json`、`start_url: "/"`、`scope: "/"`。

相关位置：

- `index.html` 第 8-12 行。
- `public/manifest.json` 第 6-7 行、第 14 行以后。

这在本地根路径正常，但发布到 GitHub Pages 项目子路径后，可能请求到 `https://soldiersmini-blip.github.io/icons/...`，从而丢失图标或 PWA 信息。

## 技术健康度

### 优点

- 构建链路可用。
- GitHub Pages 自动部署已配置。
- 使用 Vite + React，适合静态站点。
- `vite.config.ts` 已设置 `base: './'`，静态资源相对路径对首页友好。
- 页面数据主要在本地 TS 文件中，不依赖外部 API，因此线上稳定性较高。

### 风险

- 路由没有统一处理 GitHub Pages 的项目子路径。
- 没有 SPA fallback，例如 `404.html` 回退到 `index.html`。
- 本地服务依赖手动启动，用户容易误以为网站下线。
- 当前有大量未提交改动，线上版本和本地版本分叉。
- 没有 lint/test 脚本，长期维护时容易引入交互或可访问性退化。
- `npm audit` 发现 1 个低危 esbuild 漏洞，和本地 dev server 相关。

## 内容和产品体验评估

### 优点

- 定位清晰：面向中文母语者的 A1-A2 西班牙语学习中心。
- 内容量已经比较丰富，包含词汇、语法、例句、测试和学习路径。
- 有深色模式、语言切换、返回顶部、测试等学习工具。
- 当前未发布版本新增了 neural / vocabulary test / training 等模块，说明产品方向更完整。

### 体验风险

- 顶部导航使用按钮和手写路由，刷新/分享链接不可靠。
- 子页面路径不稳定，会影响用户“收藏当前页面”和“发给别人”。
- 本地和线上版本不一致，会让用户难以判断自己看到的是哪个版本。
- 学习工具越来越多，若没有清晰入口层级，后续可能显得复杂。
- 部分图标按钮只依赖 `title`，键盘和辅助技术体验还需要进一步验证。

## 可访问性风险

截图和静态检查无法证明完整 WCAG 合规，但可见风险包括：

- 部分图标按钮需要更明确的 `aria-label`。
- 自定义按钮式导航需要确认键盘焦点状态是否清晰。
- 深色模式下各类彩色文字和边框需要做对比度实测。
- 测试/训练页面需要确认错误反馈不只依赖颜色。
- 页面路由变化应考虑标题、焦点回到主内容等无障碍体验。

## 安全和依赖

`npm audit` 结果：

- 1 个 low severity 漏洞。
- 包：`esbuild`。
- 影响：Windows 下 dev server 任意文件读取风险。
- 修复方式：`npm audit fix`。

这个问题主要影响本地开发服务器，不是当前线上 GitHub Pages 首页下线原因。

## 优先修复建议

### P0：把本地和线上概念分开

给用户固定两个入口：

- 线上正式入口：`https://soldiersmini-blip.github.io/spanish-learning-center/`
- 本地预览入口：双击 `打开西班牙语学习中心.cmd` 后打开 `http://127.0.0.1:5173/`

本地入口只用于开发和预览，不应当当作正式网址。

### P1：修复 GitHub Pages 路由

推荐二选一：

1. 使用 hash 路由：`/#/a1`、`/#/a2/test?count=20`。对 GitHub Pages 最稳。
2. 保留路径路由，但统一加上 `/spanish-learning-center` basename，并添加 `404.html` fallback。

对这个项目，hash 路由成本最低、稳定性最好。

### P1：修复 PWA 和图标路径

把 `index.html` 和 `manifest.json` 里的根路径 `/...` 改为适配 GitHub Pages 子路径的相对路径或基路径。

### P1：提交并重新发布当前本地改动

现在本地改了很多文件，但线上仍是首个提交。应先确认这些改动都要上线，然后：

- 构建。
- 提交。
- 推送到 `main`。
- 等待 GitHub Actions 成功。
- 重新验证首页和关键子路径。

### P2：补充稳定性脚本

建议增加：

- `npm run check`：类型检查 + 构建。
- `npm run preview:local`：固定端口预览生产构建。
- `npm run audit`：依赖安全检查。

### P2：补充基础 QA

建议至少检查：

- 首页。
- A1 页面。
- A2 页面。
- A1/A2 测试入口。
- Neural 页面。
- 深色模式。
- 手机宽度。
- 刷新和后退。

## 总评分

- 线上可用性：8/10。首页稳定，部署成功；子路径刷新 404 扣分。
- 本地可用性：5/10。能跑，但依赖手动服务，用户容易遇到连接拒绝。
- 构建健康：8/10。构建通过，但缺少 lint/test。
- 发布流程：7/10。GitHub Pages 配好了，但本地改动没有发布，路径策略还不稳。
- 内容完整度：8/10。学习内容丰富，功能增长明显。
- 可维护性：6/10。模块增长快，需要路由、测试和发布纪律。

## 最终判断

网站不是经常真正下线。更准确地说：

1. 本地预览经常失效，因为 `127.0.0.1` 依赖本机服务持续运行。
2. 线上首页是在线的。
3. 线上子路径刷新/分享会 404，需要修路由。
4. 当前本地版本还没推送，所以线上不是最新版本。

最应该先做的是：修复 GitHub Pages 路由和资源路径，然后把当前本地版本提交推送，最后做一次线上全链路验证。
