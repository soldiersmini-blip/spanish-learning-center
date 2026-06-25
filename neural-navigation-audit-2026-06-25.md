# Neural Link Navigation Audit - 2026-06-25

## Audit Table

| 当前状态/页面 | 触发入口 | 直属上级 | 当前是否有返回上级 | 当前只有关闭按钮吗 | 应修复方式 |
|---|---|---|---|---|---|
| Neural 首页 / 独立 Workspace | `#/neural/:nodeId` | A1 或 A2 页面，由节点等级决定 | 有页面级返回 | 否 | 继续使用 `PageHeader` 返回 A1/A2。 |
| 单词 Neural Link 面板，例如 `ducharse` | 词汇卡、语法卡、推荐卡打开 Neural 面板 | 打开它的学习页面或当前主流程 | 根层无需内部返回；有关闭 X | 否 | X 只关闭整个面板，返回主学习流。 |
| 智能推荐卡片详情，例如 `反身动词` | 在 `ducharse` 面板点击智能推荐 | `ducharse` Neural Link 面板 | 修复前没有 | 是 | 新增 `NeuralPanelHeader`，显示 `返回 ducharse`，只弹出内部栈一层。 |
| 真实场景详情 | 在 `ducharse` 面板点击 `真实场景` 区域内关系卡 | `ducharse` Neural Link 面板 | 修复前没有 | 是 | 点击关系卡进入子层；顶部显示 `返回 ducharse`。 |
| 搭配与例句详情 | 在 `ducharse` 面板点击 `搭配与例句` / usage 关系卡 | `ducharse` Neural Link 面板 | 修复前没有 | 是 | 点击关系卡进入子层；顶部显示 `返回 ducharse`。 |
| 语法关系 / 近义词 / 场景词 / 记忆路径详情 | 点击任意 Neural 关系卡 | 上一个 Neural 节点详情 | 修复前没有 | 是 | 使用内部导航栈记录父节点，返回时只回上一层。 |

## Current Neural Internal Hierarchy

```text
Neural Link side panel / workspace
└── Root node, for example ducharse
    ├── Smart recommendations
    │   └── Recommendation detail, for example 反身动词
    ├── Real-life scene
    │   └── Scene node detail
    ├── Collocations and examples
    │   └── Phrase or usage detail
    └── Related knowledge sections
        └── Meaning / grammar / contrast / memory / next-step detail
```

## Fixed Problems

- Neural child details no longer rely on a close X as the only visible escape.
- Neural child details now have explicit parent labels, for example `返回 ducharse`.
- X still closes the whole Neural panel.
- Internal back pops one Neural layer without returning to the home page, A1/A2 page, or browser history.
- Parent scroll position is stored before entering a child detail and restored when returning.
- The implementation does not use `navigate(-1)`, `history.back()`, or `window.history.back()` for Neural internal return.

## Guardrail

`scripts/neural-navigation.test.mjs` verifies:

- Neural drawer and workspace both use `NeuralPanelHeader`.
- Neural drawer and workspace both keep an internal navigation stack.
- Neural drawer and workspace both preserve parent scroll positions.
- Neural child back labels name the parent node.
- Neural internals do not use `history.back()`, `navigate(-1)`, or `localStorage.clear()`.
