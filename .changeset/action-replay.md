---
"@polystate/core": minor
---

Add `recordActions()`/`replayActions()` testing utilities. `recordActions(store)` captures every action dispatched to a store from that point on (returned by `.stop()` as a `{ type, payload }[]` list); `replayActions(store, actions)` dispatches a recorded (or hand-written) action list against a store in order and returns the state after each step plus the final state — for asserting on the result instead of a hand-written dispatch/assert pair per step, and for reproducing a bug report captured from DevTools action history (`replayActions` accepts `@polystate/devtools`'s exported `DevToolsAction[]` directly, since it only needs `type`/`payload`).
