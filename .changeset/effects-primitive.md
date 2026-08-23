---
"@polystate/core": minor
---

Add `effects()` middleware — a Mode 2 (`createStore`) primitive for async side effects. Registering an action with `effects()` automatically dispatches a `${action}Success`/`${action}Failure` action with the outcome, and by default cancels a superseded run so a stale response can't land after a newer dispatch of the same action (matching RxJS `switchMap` semantics). Also adds `getState()` to `MiddlewareContext` for reading live state from any middleware, not just a dispatch-time snapshot.
