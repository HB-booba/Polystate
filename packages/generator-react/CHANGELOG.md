# @polystate/generator-react

## 1.0.0

### Major Changes

- `generateFromAST` now drives reducer generation from the parsed definition AST instead of a stub. Generated reducers use typed `PayloadAction<T>` with a `const` binding for the payload param — every action produces a correct RTK reducer (previously an action like `toggleTodo` with no payload fell back to an IIFE anti-pattern).

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
