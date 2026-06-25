# 项目资源、单词库和备份安全审计报告

日期：2026-06-25  
项目位置：`C:\Users\123\Documents\Language Advancement Plan ES`  
报告文件：`C:\Users\123\Documents\Language Advancement Plan ES\asset-and-backup-audit-2026-06-25.md`

## 1. 项目真实根目录

| 检查项 | 结果 |
|---|---|
| Git 根目录 | `C:/Users/123/Documents/Language Advancement Plan ES` |
| Windows 完整路径 | `C:\Users\123\Documents\Language Advancement Plan ES` |
| 依据 | `git rev-parse --show-toplevel` 输出 `C:/Users/123/Documents/Language Advancement Plan ES` |

## 2. Git 状态记录

### 2.1 命令输出摘要

| 命令 | 实际结果 |
|---|---|
| `git rev-parse --show-toplevel` | `C:/Users/123/Documents/Language Advancement Plan ES` |
| `git remote -v` | `origin https://github.com/soldiersmini-blip/spanish-learning-center.git (fetch)`；`origin https://github.com/soldiersmini-blip/spanish-learning-center.git (push)` |
| `git branch -vv` | `* main ec65981 [origin/main] Deploy Spanish learning center` |
| `git log -1` | `ec6598133fd1b9b81222c73318e787ff95cff768`，作者 `soldiersmini-blip <295686837+soldiersmini-blip@users.noreply.github.com>`，提交信息 `Deploy Spanish learning center` |
| `git status --short` | 13 个已跟踪修改文件，多个未跟踪目录/文件，详见下方 |

### 2.2 本地分支与 origin/main 是否一致

本地 `main` 与 `origin/main` 指向同一个提交：

`ec6598133fd1b9b81222c73318e787ff95cff768`

结论：**已提交历史一致；工作区内容不一致。** 当前有大量未提交和未跟踪文件，这些内容尚未进入 GitHub。

### 2.3 已提交并推送

以下内容属于提交 `ec65981`，已推送到 `origin/main`：

- `.github/workflows/deploy.yml`
- `.gitignore`
- `index.html`
- `package.json`
- `package-lock.json`
- `postcss.config.js`
- `tailwind.config.js`
- `tsconfig.json`
- `tsconfig.app.json`
- `vite.config.ts`
- `src/App.tsx`
- `src/main.tsx`
- `src/styles.css`
- `src/types.ts`
- `src/types/grammar.ts`
- `src/components/*` 中首版组件
- `src/data/a1.ts`
- `src/data/a2.ts`
- `src/data/grammar/a1Grammar.ts`
- `src/data/grammar/a2Grammar.ts`
- `src/i18n.ts`

### 2.4 已提交但未推送

未发现。依据：`git branch -vv` 显示 `main` 与 `[origin/main]` 同步，且无 ahead 标记。

### 2.5 已修改但未提交

依据：`git status --short` 中 `M` 标记。

| 路径 | 状态 | 风险 |
|---|---|---|
| `index.html` | 已跟踪，已修改未提交 | 中：PWA/icon 路径改动未进 GitHub |
| `src/App.tsx` | 已跟踪，已修改未提交 | 高：路由、页面入口、测试/Neural 入口改动未备份到 GitHub |
| `src/components/GrammarExplorer.tsx` | 已跟踪，已修改未提交 | 中 |
| `src/components/GrammarTopicDetail.tsx` | 已跟踪，已修改未提交 | 中 |
| `src/components/Home.tsx` | 已跟踪，已修改未提交 | 中 |
| `src/components/LevelPage.tsx` | 已跟踪，已修改未提交 | 高：课程页和词库入口改动 |
| `src/components/VocabCard.tsx` | 已跟踪，已修改未提交 | 中 |
| `src/components/VocabularyExplorer.tsx` | 已跟踪，已修改未提交 | 高：词库浏览体验改动 |
| `src/data/a1.ts` | 已跟踪，已修改未提交 | 高：A1 课程内容改动 |
| `src/data/a2.ts` | 已跟踪，已修改未提交 | 高：A2 课程内容改动 |
| `src/i18n.ts` | 已跟踪，已修改未提交 | 中 |
| `src/styles.css` | 已跟踪，已修改未提交 | 中 |
| `src/types.ts` | 已跟踪，已修改未提交 | 中 |

### 2.6 未跟踪文件和目录

依据：`git ls-files --others --exclude-standard`。

| 路径 | 类型 | 风险 |
|---|---|---|
| `audit-report-2026-06-25.md` | 审计文档 | 中 |
| `public/` | PWA、favicon、图标资源 | 高 |
| `src/components/BrandLogo.tsx` | 新组件 | 中 |
| `src/components/Footer.tsx` | 新组件 | 中 |
| `src/components/VocabMasteryTest.tsx` | 新测试组件 | 高 |
| `src/components/VocabQuizCard.tsx` | 新测试组件 | 高 |
| `src/components/VocabTestResult.tsx` | 新测试组件 | 高 |
| `src/components/neural/` | Neural 学习组件 | 高 |
| `src/components/test/` | 测试系统组件 | 高 |
| `src/components/training/` | 训练系统组件 | 高 |
| `src/data/neural/` | Neural 关系数据 | 高 |
| `src/data/vocabulary/` | A1/A2 主单词库 | 高 |
| `src/pages/` | 新页面 | 高 |
| `src/types/neuralEngine.ts` | 类型定义 | 中 |
| `src/types/training.ts` | 类型定义 | 中 |
| `src/types/vocabTest.ts` | 类型定义 | 中 |
| `src/utils/` | 训练、词库、Neural 工具 | 高 |
| `src/vite-env.d.ts` | Vite 类型 | 低 |
| `vite-dev.err` | 空日志 | 低 |
| `vite-dev.log` | 空日志 | 低 |
| `打开西班牙语学习中心.cmd` | 本地启动脚本 | 中 |

### 2.7 被 `.gitignore` 忽略

`.gitignore` 内容：

```text
node_modules
dist
.DS_Store
*.local
```

`git status --ignored --short` 显示：

- `!! dist/`
- `!! node_modules/`

结论：没有发现主词库、图片、课程内容被 `.gitignore` 错误忽略。`dist/` 和 `node_modules/` 可再生，不应作为源代码备份。

## 3. 完整资源清单

| 资源类别 | 具体内容 | 本地完整路径 | Git 中的路径 | 是否被 Git 跟踪 | 是否已推送 | 是否参与线上构建 | 唯一原始来源 | 是否已有备份 | 丢失风险 |
|---|---|---|---|---|---|---|---|---|---|
| React/TS 源码 | 应用入口、路由、页面状态 | `C:\Users\123\Documents\Language Advancement Plan ES\src\App.tsx` | `src/App.tsx` | 是，已修改 | 旧版已推送；当前改动未推送 | 是 | 本地工作区 | 已进 ZIP；旧版进 GitHub | 高 |
| React/TS 源码 | React 挂载入口 | `...\src\main.tsx` | `src/main.tsx` | 是 | 是 | 是 | GitHub + 本地 | Git bundle + ZIP | 低 |
| CSS | Tailwind 全局样式 | `...\src\styles.css` | `src/styles.css` | 是，已修改 | 旧版已推送；当前改动未推送 | 是 | 本地工作区 | 已进 ZIP | 中 |
| HTML | Vite HTML 入口、PWA 头部 | `...\index.html` | `index.html` | 是，已修改 | 旧版已推送；当前改动未推送 | 是 | 本地工作区 | 已进 ZIP | 中 |
| 配置 | Vite 配置 | `...\vite.config.ts` | `vite.config.ts` | 是 | 是 | 是 | GitHub + 本地 | Git bundle + ZIP | 低 |
| 配置 | Tailwind 配置 | `...\tailwind.config.js` | `tailwind.config.js` | 是 | 是 | 是 | GitHub + 本地 | Git bundle + ZIP | 低 |
| 配置 | TypeScript 配置 | `...\tsconfig.json`、`...\tsconfig.app.json` | `tsconfig.json`、`tsconfig.app.json` | 是 | 是 | 是 | GitHub + 本地 | Git bundle + ZIP | 低 |
| 配置 | Package 清单和锁文件 | `...\package.json`、`...\package-lock.json` | `package.json`、`package-lock.json` | 是 | 是 | 是 | GitHub + npm registry | Git bundle + ZIP | 低 |
| 部署脚本 | GitHub Pages Actions | `...\.github\workflows\deploy.yml` | `.github/workflows/deploy.yml` | 是 | 是 | 是 | GitHub + 本地 | Git bundle + ZIP | 低 |
| 本地脚本 | 本地启动脚本 | `...\打开西班牙语学习中心.cmd` | 未跟踪 | 否 | 否 | 否 | 本地工作区 | 已进 ZIP | 中 |
| A1 课程 | A1 课程结构、模块、句型 | `...\src\data\a1.ts` | `src/data/a1.ts` | 是，已修改 | 旧版已推送；当前改动未推送 | 是 | 本地工作区 | 已进 ZIP | 高 |
| A2 课程 | A2 课程结构、模块、句型 | `...\src\data\a2.ts` | `src/data/a2.ts` | 是，已修改 | 旧版已推送；当前改动未推送 | 是 | 本地工作区 | 已进 ZIP | 高 |
| 语法内容 | A1 语法库 | `...\src\data\grammar\a1Grammar.ts` | `src/data/grammar/a1Grammar.ts` | 是 | 是 | 是 | GitHub + 本地 | Git bundle + ZIP | 低 |
| 语法内容 | A2 语法库 | `...\src\data\grammar\a2Grammar.ts` | `src/data/grammar/a2Grammar.ts` | 是 | 是 | 是 | GitHub + 本地 | Git bundle + ZIP | 低 |
| 主单词库 | A1 主词库源码，812 条构建后唯一项 | `...\src\data\vocabulary\a1\source.ts` | `src/data/vocabulary/a1/source.ts` | 否，未跟踪 | 否 | 是 | 本地工作区 | 已进 ZIP | 高 |
| 主单词库 | A2 主词库源码，1203 条构建后唯一项 | `...\src\data\vocabulary\a2\source.ts` | `src/data/vocabulary/a2/source.ts` | 否，未跟踪 | 否 | 是 | 本地工作区 | 已进 ZIP | 高 |
| 词库生成 | 去重、分类、ID、例句生成工具 | `...\src\data\vocabulary\helpers.ts` | `src/data/vocabulary/helpers.ts` | 否，未跟踪 | 否 | 是 | 本地工作区 | 已进 ZIP | 高 |
| 词库类型 | Vocabulary 类型定义 | `...\src\data\vocabulary\types.ts` | `src/data/vocabulary/types.ts` | 否，未跟踪 | 否 | 是 | 本地工作区 | 已进 ZIP | 高 |
| 测试题库 | 从词库动态生成训练/测试题 | `...\src\utils\vocabTest.ts`、`...\src\utils\TrainingEngine.ts` | 未跟踪 | 否 | 否 | 是 | 本地工作区 + 主词库 | 已进 ZIP | 高 |
| 错题/结果 UI | 词汇测试结果组件 | `...\src\components\test\*`、`...\src\components\training\*` | 未跟踪 | 否 | 否 | 是 | 本地工作区 | 已进 ZIP | 高 |
| Neural 数据 | 关系字典和自动关系生成 | `...\src\data\neural\relationDictionaries.ts`、`...\src\utils\neural\*` | 未跟踪 | 否 | 否 | 是 | 本地工作区 | 已进 ZIP | 高 |
| 图片资源 | favicon、PNG 图标、SVG Logo | `...\public\favicon.ico`、`...\public\icons\*` | 未跟踪 | 否 | 否 | 是 | 本地工作区 | 已进 ZIP | 高 |
| PWA | manifest、browserconfig | `...\public\manifest.json`、`...\public\browserconfig.xml` | 未跟踪 | 否 | 否 | 是 | 本地工作区 | 已进 ZIP | 高 |
| 音频 | 发音文件 | 未发现 | 无 | 无 | 无 | 否 | 无 | 无 | 无 |
| 视频 | 视频文件 | 未发现 | 无 | 无 | 无 | 否 | 无 | 无 | 无 |
| 字体 | 本地字体文件 | 未发现 | 无 | 无 | 无 | 否 | 无 | 无 | 无 |
| JSON | `package.json`、`package-lock.json`、`public/manifest.json` | 见上 | 见上 | package 已跟踪；manifest 未跟踪 | package 已推送；manifest 未推送 | 是 | 本地/GitHub | 已进 ZIP | 中 |
| CSV/TXT/SQLite | 数据库或表格文件 | 未发现 | 无 | 无 | 无 | 否 | 无 | 无 | 无 |
| Markdown | 审计报告 | `...\audit-report-2026-06-25.md`、本报告 | 未跟踪 | 否 | 否 | 否 | 本地工作区 | ZIP 备份包含上一份报告；本报告已追加进 ZIP | 中 |
| 外部依赖 | npm 包 | `package-lock.json` 指向 `https://registry.npmjs.org/...` | `package-lock.json` | 是 | 是 | 是 | npm registry + lockfile | Git bundle + ZIP | 低 |
| 外部 API/CDN | 运行时 API、CDN、云数据库 | 未发现 | 无 | 无 | 无 | 否 | 无 | 无 | 无 |
| 本地绝对路径 | 启动脚本固定 Node 路径 | `...\打开西班牙语学习中心.cmd` 第 5 行 | 未跟踪 | 否 | 否 | 否 | 本机 F: 路径 | 已进 ZIP | 中 |

## 4. 单词库重点审计

### 4.1 搜索到的存储方式

| 存储方式 | 检查结果 | 依据 |
|---|---|---|
| TypeScript 数组/对象 | 存在，是主词库来源 | `src/data/vocabulary/a1/source.ts`、`src/data/vocabulary/a2/source.ts` |
| JSON 文件 | 无主词库 JSON；仅 `public/manifest.json`、package 文件 | 文件扫描 |
| CSV 文件 | 未发现 | 文件扫描 |
| SQLite/数据库 | 未发现 | 文件扫描 |
| 外部 API | 未发现运行时词库 API | `rg "fetch|https?://"` 未发现词库 API |
| localStorage | 存在，用于用户设置、进度、错题、测试记录 | `src/App.tsx`、`src/components/LevelPage.tsx`、`src/utils/vocabTest.ts`、`src/pages/VocabularyTestPage.tsx`、`src/components/neural/NeuralProgress.tsx` |
| sessionStorage | 存在，用于 Neural 返回路径 | `src/App.tsx` |
| IndexedDB | 未发现 | 搜索 `indexedDB` 无命中 |
| Web SQL | 未发现 | 搜索 `openDatabase` 无命中 |
| Cache Storage | 未发现 | 搜索 `caches.` 无命中 |

### 4.2 单词库真实主数据源

主数据源不是数据库，也不是 JSON/CSV，而是 TypeScript 硬编码数据：

- A1：`C:\Users\123\Documents\Language Advancement Plan ES\src\data\vocabulary\a1\source.ts`
- A2：`C:\Users\123\Documents\Language Advancement Plan ES\src\data\vocabulary\a2\source.ts`

入口：

- `src/data/vocabulary/a1/index.ts` 导入 `a1VocabularySource`，通过 `mergeUnique` 生成 `a1VocabularyItems`
- `src/data/vocabulary/a2/index.ts` 导入 `a2VocabularySource`，通过 `mergeUnique` 生成 `a2VocabularyItems`

统计结果：

- A1：812 条唯一词条；重复项被去重：`mucho`、`bien`、`mal`
- A2：1203 条唯一词条；存在 33 个重复生成项，例如 `reservar el horario`、`el viaje cómodo`、`el mensaje seguro`

### 4.3 单词库是否完整保存在 GitHub 仓库中

否。当前主词库目录 `src/data/vocabulary/` 是未跟踪文件，还没有推送到 GitHub。

证据：

- `git ls-files --others --exclude-standard` 输出包含：
  - `src/data/vocabulary/a1/source.ts`
  - `src/data/vocabulary/a2/source.ts`
  - `src/data/vocabulary/helpers.ts`
  - `src/data/vocabulary/types.ts`
- `git status --short` 显示 `?? src/data/vocabulary/`

### 4.4 用户新增或修改的单词保存在哪里

源码中没有发现“用户新增/编辑单词并持久保存”的功能。词库来自源码 TS 文件，用户不能在网站上永久新增词条。

如果未来增加用户自定义词库，目前没有后端或导入导出机制承接。

### 4.5 用户学习数据保存在哪里

| 键名 | 存储位置 | 内容 | 是否只在当前浏览器 |
|---|---|---|---|
| `spanish-locale` | localStorage | 界面语言 | 是 |
| `spanish-theme` | localStorage | 明暗主题 | 是 |
| `spanish-progress-a1` | localStorage | A1 模块完成进度 ID 数组 | 是 |
| `spanish-progress-a2` | localStorage | A2 模块完成进度 ID 数组 | 是 |
| `spanish-vocab-test-records-A1` | localStorage | A1 词汇测试记录 | 是 |
| `spanish-vocab-test-records-A2` | localStorage | A2 词汇测试记录 | 是 |
| `spanish-vocab-training-wrong-A1` | localStorage | A1 错题词 ID，最多保留 300 个 | 是 |
| `spanish-vocab-training-wrong-A2` | localStorage | A2 错题词 ID，最多保留 300 个 | 是 |
| `spanish-neural-learning-progress` | localStorage | Neural 已访问节点、已理解链接、更新时间 | 是 |
| `spanish-neural-return-url` | sessionStorage | Neural 页面返回路径 | 是，且浏览器会话结束后更容易丢失 |

Chrome Default Profile 的 Local Storage LevelDB 中检测到相关键：

- `spanish-locale`
- `spanish-neural-learning-progress`
- `127.0.0.1`

相关文件：

- `C:\Users\123\AppData\Local\Google\Chrome\User Data\Default\Local Storage\leveldb\089599.ldb`
- `C:\Users\123\AppData\Local\Google\Chrome\User Data\Default\Local Storage\leveldb\089602.ldb`

安全说明：没有导出原始 Chrome LevelDB 文件，因为这些文件可能混有其他网站数据和会话材料，安全审查拒绝了该操作。没有清理浏览器数据。

### 4.6 清缓存、换浏览器、换电脑风险

| 问题 | 回答 |
|---|---|
| 清除浏览器缓存或网站数据后是否丢失 | 会。localStorage/sessionStorage 数据会丢失 |
| 换浏览器是否同步 | 不会。没有账号系统或云同步 |
| 换电脑或手机是否同步 | 不会。没有后端同步 |
| 线上版本和本地版本是否使用同一份词库 | 否。线上 GitHub 当前没有新的 `src/data/vocabulary/` 主词库；本地当前版本使用本地未跟踪词库 |
| 是否存在多份不一致词库 | 是。旧版课程词汇已在已推送的 `src/data/a1.ts`、`src/data/a2.ts` 中；新版主词库在未跟踪 `src/data/vocabulary/` 中 |
| 是否存在无法从源码重新生成的内容 | 用户浏览器 localStorage 进度、错题、测试记录无法从源码重新生成 |

## 5. 文件丢失风险检查

| 检查项 | 结果 | 风险 |
|---|---|---|
| 重要资源只保存在当前电脑 | 是：`src/data/vocabulary/`、`public/`、Neural/测试/训练新模块未推送 | 高 |
| 重要文件未被 Git 跟踪 | 是，见 `git ls-files --others --exclude-standard` | 高 |
| 重要文件被 `.gitignore` 错误忽略 | 未发现；只忽略 `node_modules`、`dist`、`.DS_Store`、`*.local` | 低 |
| 重要文件只存在于 `dist` | 未发现；`dist` 可由源码构建生成 | 低 |
| `C:\` 或本地绝对路径引用 | 未发现 `C:\` 运行时资源；启动脚本有 `F:\...NodeJS\node.exe` | 中 |
| 项目外音频/图片/词库 | 未发现；桌面只有快捷方式，Downloads 有项目 PDF | 低/中 |
| 临时目录资源 | 有 Codex 截图缓存，但未作为网站源资源引用 | 低 |
| 浏览器缓存依赖数据 | 有：localStorage 学习进度、错题、测试记录 | 高 |
| 可能失效第三方链接 | npm registry 依赖；运行时未发现 API/CDN | 低 |
| 大小写问题 | `git ls-files` 未发现大小写冲突 | 低 |
| 尚未推送重要改动 | 是，大量未提交/未跟踪 | 高 |
| 单一副本且不可重建 | 浏览器学习数据、未推送词库和图标在备份前只有本地单份 | 高 |

## 6. 已创建的真实本地备份

备份目录：

`C:\Users\123\Documents\Language Advancement Plan ES Backups`

### 6.1 Git 历史备份

| 项 | 值 |
|---|---|
| 文件 | `C:\Users\123\Documents\Language Advancement Plan ES Backups\spanish-learning-center-git-2026-06-25.bundle` |
| 大小 | 397,855 bytes |
| SHA-256 | `6FAD1AC89E6C55D0ACC4B571F3DC56106466B3682F5D77F8A2E3ECC38BFD8D8A` |
| 验证 | `git bundle verify` exit code 0 |
| 验证输出 | `is okay`；包含 `refs/heads/main`、`refs/remotes/origin/main`、`HEAD` 和一个 Codex turn-diff ref；记录 complete history |

### 6.2 当前工作目录 ZIP

| 项 | 值 |
|---|---|
| 文件 | `C:\Users\123\Documents\Language Advancement Plan ES Backups\spanish-learning-center-working-copy-2026-06-25-0244.zip` |
| 大小 | 597,881 bytes |
| SHA-256 | `0D9F291C4AA66F880D1975A4648643E2D6B684FAFB1A5E84B67CD1295B96FEA7` |
| 条目数 | 105，已追加本报告 |
| 包含 | 源码、未提交修改、未跟踪词库、图片、PWA、配置、GitHub Actions、上一份审计报告 |
| 排除 | `.git`、`node_modules`、`dist`、`.vite` |

### 6.3 备份恢复测试

恢复目录：

`C:\tmp\spanish-learning-center-restore-test-2026-06-25-0245`

| 测试项 | 结果 |
|---|---|
| ZIP 可打开并解压 | 通过 |
| 解压文件数 | 104 |
| `package.json` 存在 | 通过 |
| `src` 目录存在 | 通过 |
| `public` 目录存在 | 通过 |
| A1 词库 `src/data/vocabulary/a1/source.ts` 存在 | 通过 |
| A2 词库 `src/data/vocabulary/a2/source.ts` 存在 | 通过 |
| GitHub Actions 配置存在 | 通过 |
| `npm ci` | 通过，安装 136 packages；提示 1 个 low severity vulnerability；未运行 `npm audit fix` |
| `npm run build` | 通过，Vite 构建成功，1639 modules transformed |

没有删除恢复测试目录。

## 7. 敏感信息检查

| 检查项 | 结果 |
|---|---|
| `.env` / `.env.*` | 未发现 |
| API Key / Token / 私钥 | 未发现真实密钥 |
| 命中的 `password` | 属于课程词汇，如 `contraseña`，不是配置密码 |
| GitHub Actions `id-token: write` | 部署权限配置，不是密钥值 |

结论：当前项目源码中未发现需要隐藏的运行密钥。若未来加入 API key，应放在 GitHub Secrets 或本机 `.env.local`，并单独加密备份，不应提交公开仓库。

## 8. 风险分级

### 高风险：丢失后无法完整恢复

- 未跟踪主词库：`src/data/vocabulary/`
- 未跟踪测试/训练/Neural 模块：`src/components/test/`、`src/components/training/`、`src/components/neural/`、`src/utils/`、`src/pages/`
- 未跟踪 PWA 和图标资源：`public/`
- 浏览器 localStorage 中的学习进度、错题、测试记录、Neural 学习状态
- 本地未提交的 `src/data/a1.ts`、`src/data/a2.ts` 课程改动

### 中风险：可以恢复，但需要人工工作

- 本地启动脚本：`打开西班牙语学习中心.cmd`
- `index.html` 中 PWA/icon 改动
- `src/App.tsx` 路由和页面状态改动
- 桌面快捷方式：`C:\Users\123\Desktop\西班牙语学习中心.lnk`
- Downloads 中项目 PDF：`C:\Users\123\Downloads\ChatGPT-西班牙语学习网站项目.pdf`

### 低风险：可从源码、依赖或构建流程重新生成

- `node_modules/`
- `dist/`
- Vite 构建产物
- npm 依赖包
- 空日志：`vite-dev.log`、`vite-dev.err`

## 9. 下一步修复建议

1. 立即提交并推送高价值未跟踪内容，尤其是 `src/data/vocabulary/`、`public/`、`src/utils/`、`src/components/test/`、`src/components/training/`、`src/components/neural/`。
2. 给用户学习数据增加导出/导入功能，至少导出 localStorage 中的 `spanish-*` 键为 JSON。
3. 修复 GitHub Pages 路由和 PWA 资源路径，避免子路径刷新 404。
4. 为词库增加校验脚本，把 A1/A2 词条数量、重复项、缺失例句作为构建前检查。
5. 把 `npm audit` 的 low severity esbuild 问题单独评估后再升级修复；本次未运行 `npm audit fix`。
6. 建议定期创建 `git bundle` + 工作目录 ZIP，尤其在大量未提交内容存在时。

## 10. 明确回答

| 问题 | 回答 |
|---|---|
| 网站代码目前一共保存了几份，分别在哪里？ | 至少 3 份：1. 本地工作区 `C:\Users\123\Documents\Language Advancement Plan ES`；2. GitHub 仓库 `https://github.com/soldiersmini-blip/spanish-learning-center.git`，但只含已提交旧版；3. 本地备份 `C:\Users\123\Documents\Language Advancement Plan ES Backups\spanish-learning-center-working-copy-2026-06-25-0244.zip` 和 Git 历史 bundle。 |
| 单词库目前一共保存了几份，分别在哪里？ | 当前新版主词库至少 2 份：1. 本地工作区 `src\data\vocabulary\a1\source.ts`、`src\data\vocabulary\a2\source.ts`；2. 本地 ZIP 备份。它尚未进入 GitHub。旧版课程词汇还存在于已推送的 `src/data/a1.ts`、`src/data/a2.ts`。 |
| 图片、音频和课程资源是否全部进入 GitHub？ | 否。课程旧版进入 GitHub；当前改动未全部进入。图片/PWA 图标在 `public/`，当前未跟踪、未推送。音频文件未发现。 |
| 本地未提交内容是否存在丢失风险？ | 是，高风险。虽然本次 ZIP 已备份当前工作目录，但这些内容仍未进入 GitHub。 |
| 清理浏览器数据是否会丢失单词或学习进度？ | 不会丢失源码词库；会丢失学习进度、错题、测试记录、主题、语言设置、Neural 学习状态。 |
| 电脑硬盘损坏后，能否仅依靠 GitHub 完整恢复？ | 不能。GitHub 当前缺少未跟踪主词库、PWA 图片、测试/训练/Neural 新模块和本地未提交改动。 |
| 本次是否已经实际创建本地备份？ | 是。已创建 Git bundle 和工作目录 ZIP。浏览器原始 localStorage 没有导出，因为可能包含其他网站数据。 |
| 备份文件是否经过打开、校验和恢复构建测试？ | 是。bundle 已 `git bundle verify`；ZIP 已解压并检查关键文件；恢复目录中 `npm ci` 和 `npm run build` 均成功。 |
