# Code Review Checklist

## Navigation

- Every independent page except `#/` has a visible return button to its direct parent menu.
- The back button label names the real parent destination.
- Every route is declared in `src/navigation/routes.ts`.
- Every non-root route has `parentRouteId`.
- No page relies on `navigate(-1)` or `history.back()` as the main return behavior.
- No page uses `href="#"` as a navigation placeholder.
- Deep links can be opened directly and still provide a valid parent return.
- In-progress tests or training sessions confirm before discarding current work.
- Navigation changes pass `npm test`, including `scripts/navigation-rules.test.mjs`.

## Learning Data Safety

- Do not use `localStorage.clear()`.
- Changes must not overwrite unrelated progress, wrong-word, favorite, test-record, or Neural data.
- Any saved draft must be scoped to the current feature and level.
