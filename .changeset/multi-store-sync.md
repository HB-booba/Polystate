---
"@polystate/core": minor
---

Add `syncStores()` — keeps one store's state mirrored into another without manually wiring a subscription, e.g. a shared "current user" slice used by several independent feature stores. `merge(sourceState, targetState)` runs once immediately and again on every subsequent source dispatch, applying its result to the target via `setState()`. Sync is one-directional; call `syncStores` once per source/target pair to mirror into more than one target.
