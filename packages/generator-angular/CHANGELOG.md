# @polystate/generator-angular

## 1.0.0

### Major Changes

- `generateNgRxReducerFromAST` now drives `on()` handler generation from the parsed definition AST instead of a stub, using the same `const`-binding pattern as the React generator with proper payload types — no more `any` in `props<>()` definitions.

### Patch Changes

- Updated dependencies:
  - @polystate/definition@1.0.0

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
  - @polystate/definition@0.2.0
