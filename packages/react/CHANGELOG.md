# @polystate/react

## 1.0.0

### Major Changes

- `createStoreContext` now returns `useStore`/`useSelector`/`useDispatch`/`useSetState` directly, and its `useStore` resolves to state rather than the raw `Store` instance. The previous raw-store access is still available via `useContextStore` for advanced use.
- `useDispatch<T, A>` returns a dispatch function typed to `keyof A & string`, and `StoreHooks<T, A>` / `createStoreHooks<T, A>` are fully typed end to end.

### Patch Changes

- `useSelector` now uses a stable ref, so it no longer re-subscribes on every render when passed an inline arrow function.
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
