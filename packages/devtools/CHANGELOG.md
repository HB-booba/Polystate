# @polystate/devtools

## 1.0.0

### Major Changes

- Fixed the DevTools middleware never actually being wired to the browser extension correctly:
  - `init(store.getState())` is now called immediately after connecting, so the DevTools panel shows the baseline `@@INIT` state instead of starting blank.
  - `subscribe()` is now registered once at middleware creation instead of being re-registered inside the per-action handler on every dispatch.
  - The action-history array was replaced with a `Map<actionIndex, T>` snapshot store keyed by the same monotonic counter used for `actionId`, fixing `JUMP_TO_ACTION`/`JUMP_TO_STATE` lookups that broke once older entries were evicted by the `maxAge` cap.

### Patch Changes

- Updated dependencies:
  - @polystate/core@1.0.0

## 0.2.0

### Minor Changes

- Initial release of Polystate - Framework-agnostic state management with code generation
  - Add @polystate/core: Framework-agnostic reactive state management (0 dependencies)
  - Add @polystate/react: React 18+ hooks (useStore, useSelector, useDispatch)
  - Add @polystate/angular: Angular 17+ services with computed signals
  - Add @polystate/cli: CLI tool for code generation
  - Add @polystate/definition: Type-safe store definitions
  - Add @polystate/devtools: Redux DevTools Extension middleware
  - Add @polystate/generator-react: Generate Redux + RTK code from definitions
  - Add @polystate/generator-angular: Generate NgRx code from definitions

### Patch Changes

- Updated dependencies []:
  - @polystate/core@0.2.0
