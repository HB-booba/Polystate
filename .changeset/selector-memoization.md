---
"@polystate/core": minor
---

Add `createSelector()` — a lightweight, zero-dependency memoized-selector helper for Mode 2 (`createStore`). Combines one or more input selectors and only re-runs the combiner when an input's result actually changes (reference equality), matching `reselect`'s default memoization — the same utility already used by the generated React and Angular code.
