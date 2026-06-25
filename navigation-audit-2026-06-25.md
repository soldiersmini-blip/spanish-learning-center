# Navigation Audit - 2026-06-25

## Route Audit Table

| 当前页面 | 当前路由 | 直属上级页面 | 应返回路由 | 当前是否有返回按钮 | 修复前实际返回哪里 | 是否存在跨级跳转 | 修复方案 |
|---|---|---|---|---|---|---|---|
| 全站首页 | `#/` | 无 | 无 | 不需要 | 无 | 否 | 首页为唯一根页面。 |
| A1 首页 | `#/a1` | 学习中心 | `#/` | 有 | 首页 | 否 | 改为统一 `PageHeader`，按钮文案为 `返回 学习中心`。 |
| A2 首页 | `#/a2` | 学习中心 | `#/` | 有 | 首页 | 否 | 改为统一 `PageHeader`，按钮文案为 `返回 学习中心`。 |
| B1 预留页 | `#/b1` | 学习中心 | `#/` | 有 | 首页 | 否 | 改为统一 `PageHeader`。 |
| B2 预留页 | `#/b2` | 学习中心 | `#/` | 有 | 首页 | 否 | 改为统一 `PageHeader`。 |
| 设置 / 数据导入导出 | `#/settings` | 学习中心 | `#/` | 有 | 首页 | 否 | 改为统一 `PageHeader`。 |
| A1 词汇训练中心 | `#/a1/test/settings` | A1 | `#/a1` | 有 | A1 | 否 | 训练中心使用 `TestHeader` + route metadata。 |
| A1 答题页 | `#/a1/test/session` | A1 词汇训练中心 | `#/a1/test/settings` | 有 | 修复前显示 `返回A1`，会跨级回 A1 | 是 | 返回按钮改为 `返回 A1 词汇训练中心`；进行中退出需确认。 |
| A1 测试结果页 | `#/a1/test/result` | A1 词汇训练中心 | `#/a1/test/settings` | 有 | 修复前可能回学习页或重置内部状态 | 是 | 返回按钮改为 `返回 A1 词汇训练中心`。 |
| A2 词汇训练中心 | `#/a2/test/settings` | A2 | `#/a2` | 有 | A2 | 否 | 训练中心使用 `TestHeader` + route metadata。 |
| A2 答题页 | `#/a2/test/session` | A2 词汇训练中心 | `#/a2/test/settings` | 有 | 修复前显示 `返回A2`，会跨级回 A2 | 是 | 返回按钮改为 `返回 A2 词汇训练中心`；进行中退出需确认。 |
| A2 测试结果页 | `#/a2/test/result` | A2 词汇训练中心 | `#/a2/test/settings` | 有 | 修复前可能回学习页或重置内部状态 | 是 | 返回按钮改为 `返回 A2 词汇训练中心`。 |
| A1 Neural Link | `#/neural/:nodeId` | A1 | `#/a1` | 有 | 修复前优先 `window.history.back()`，直接打开时不可预测 | 是 | 移除 history back 作为主逻辑；按节点等级或来源 hash 返回确定父级。 |
| A2 Neural Link | `#/neural/:nodeId` | A2 | `#/a2` | 有 | 修复前优先 `window.history.back()`，直接打开时不可预测 | 是 | 移除 history back 作为主逻辑；按节点等级或来源 hash 返回确定父级。 |

## Source Scan Scope

Checked page components and navigation surfaces for:

- `navigate(...)`
- `navigate(-1)`
- `Link`
- `NavLink`
- `window.history`
- `history.back()`
- `location.href`
- `href="#"`
- return buttons
- breadcrumb navigation
- page close buttons

## Fixed Issues

- Vocabulary session and result pages no longer return directly to A1/A2 when their direct parent is the training center.
- Neural return no longer depends on `window.history.back()` as the primary return behavior.
- Level pages, coming-soon pages, settings, Neural workspace, and test pages now use one unified visible page header or wrapper.
- Third-level pages now render breadcrumbs such as `学习中心 > A1 > A1 词汇训练中心 > A1 答题`.
- Active vocabulary training return now shows a confirmation dialog before losing the current session.

## Automated Guardrail

`scripts/navigation-rules.test.mjs` verifies:

1. All non-root routes declare `parentRouteId`.
2. Parent route ids exist.
3. A route cannot be its own parent.
4. Parent chains cannot form cycles.
5. Key independent pages render the unified page header path.
6. `href="#"` is not used as a return target.
7. `navigate(-1)` and `history.back()` are not used as primary return logic.
8. Deep return targets use GitHub Pages hash routes and do not point to local paths.
