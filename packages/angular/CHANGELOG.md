# @polystate/angular

## 1.0.0

### Major Changes

- `PolystateService<T, A>` dispatch is now typed to `keyof A & string`, and `createAngularService<T, A>` preserves the action map type through to `dispatch` — wrong action names/payloads are compile-time errors.

### Patch Changes

- Fixed a memory leak in `PolystateService`: `select()` and `select$()` subscriptions weren't tracked, so they leaked past `ngOnDestroy`. Both now register their teardown in a `_cleanups` array that's flushed on destroy.
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
