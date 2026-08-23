---
"@polystate/core": minor
---

Add `withHistory()` — a bounded undo/redo stack for in-app UX (e.g. an editor's Ctrl+Z), independent of the DevTools time-travel integration. Wraps a store, recording each dispatch's prior state (capped at an optional `limit`, default 100) and adding `undo()`/`redo()`/`canUndo()`/`canRedo()`/`clearHistory()`. Dispatching a new action after `undo()` clears the redo stack, matching standard editor semantics; stepping through history applies state via `setState()`, so it's never itself recorded as a new history entry.
