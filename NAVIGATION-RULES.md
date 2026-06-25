# Navigation Rules

This project has one non-negotiable navigation rule:

> Except for the global home page, every independently accessible page, detail page, drawer state, modal state, and nested panel state must provide a clear, clickable, always-visible entry that returns to its direct parent menu or parent state.

## Required Rules

1. Every independent page except the global home page must have a visible return entry to its direct parent menu.
2. Cross-level return is forbidden unless the user explicitly chooses a global navigation item such as Home, the logo, or the main menu.
3. Browser history APIs such as `navigate(-1)` or `history.back()` cannot be the only return mechanism.
4. Every route must declare a direct parent route in `src/navigation/routes.ts`.
5. Deep pages must support direct access, refresh, new-tab opening, and external entry.
6. Return button text must name the destination, for example `返回 A1`, `返回 A1 词汇训练中心`, or `返回 学习中心`.
7. In-progress tests, training, dictation, or Neural sessions must protect user data before returning.
8. A new page that violates these rules must not be merged or deployed.

## Neural Link Special Rules

1. Neural drawers, side panels, workspaces, card details, recommendation details, scene details, collocation details, grammar relation details, and related-word details all count as page states.
2. A close `X` closes the whole Neural panel only. It never replaces a parent return button.
3. Any Neural child state must render a parent return entry such as `返回 ducharse` or `返回 智能推荐`.
4. Returning from a Neural child state must pop only one Neural level and must not close the whole panel.
5. Returning from a Neural child state should preserve the parent panel scroll position and expanded sections.
6. Neural internal navigation must use an explicit state stack or explicit parent route. It must not rely on `navigate(-1)`, `history.back()`, or `window.history.back()` as the only behavior.
7. New Neural child states must declare a parent state or route. Missing parent state is a test failure.

## Current Route Tree

```text
西班牙语学习中心 (#/)
├── A1 (#/a1)
│   ├── A1 词汇训练中心 (#/a1/test/settings)
│   │   ├── A1 答题 (#/a1/test/session)
│   │   └── A1 测试结果 (#/a1/test/result)
│   └── A1 Neural Link (#/neural/:nodeId)
├── A2 (#/a2)
│   ├── A2 词汇训练中心 (#/a2/test/settings)
│   │   ├── A2 答题 (#/a2/test/session)
│   │   └── A2 测试结果 (#/a2/test/result)
│   └── A2 Neural Link (#/neural/:nodeId)
├── B1 (#/b1)
├── B2 (#/b2)
└── 设置 (#/settings)
```

## Neural Internal State Tree

```text
Neural Link side panel / workspace
└── Word or knowledge node, for example ducharse
    ├── Smart recommendations
    │   └── Recommendation detail, for example 反身动词
    ├── Real-life scene relations
    │   └── Scene detail
    ├── Collocations and example usage
    │   └── Collocation or phrase detail
    └── Meaning / grammar / contrast / memory / learning-path relations
        └── Related node detail
```

## Implementation Contract

- Route metadata lives in `src/navigation/routes.ts`.
- Hash route creation lives in `src/navigation/hashRoutes.ts`.
- The unified page return entry and breadcrumbs are rendered through `src/components/navigation/PageHeader.tsx`.
- Vocabulary test pages use `src/components/test/TestHeader.tsx`, which wraps `PageHeader`.
- Neural internal panel return and close actions are rendered through `src/components/neural/NeuralPanelHeader.tsx`.
- Navigation checks live in `scripts/navigation-rules.test.mjs` and `scripts/neural-navigation.test.mjs`; both run through `npm test`.

## In-Progress Session Rule

When a user leaves an active training or test session:

1. If there is no unsaved progress, return directly to the parent menu.
2. If progress exists, show a confirmation dialog with:
   - Save and return
   - Abandon and return
   - Continue current training
3. Saving must only touch the current session draft and must never clear unrelated `localStorage` data.

## Review Checklist

Before merging or deploying a page-level or panel-level change:

- The page or panel state has a route id or explicit parent state.
- The page or panel state has exactly one default direct parent.
- The visible back label matches the actual parent target.
- A close button is not treated as a parent return button.
- Deep-link refresh still has a useful parent return.
- The page does not use `href="#"` as a return target.
- The page does not rely on `navigate(-1)` or `history.back()` as the main return action.
- Neural child panels preserve parent context as much as possible.
- The page preserves relevant parent state as much as possible.
