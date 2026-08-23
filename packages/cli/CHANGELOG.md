# @polystate/cli

## 1.0.0

### Major Changes

- Generators now read the store definition's real AST via `ts-morph` (`parseDefinitionFile` → `generateFromAST` / `generateNgRxReducerFromAST`) instead of emitting stub reducers (`(state) => state`). This was the headline v1.0 blocker — every `polystate generate` invocation now produces working, typed reducer logic instead of a placeholder that had to be hand-written afterward.

### Patch Changes

- Updated dependencies:
  - @polystate/definition@1.0.0
  - @polystate/generator-react@1.0.0
  - @polystate/generator-angular@1.0.0

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
  - @polystate/generator-react@0.2.0
  - @polystate/generator-angular@0.2.0
