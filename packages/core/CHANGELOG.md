# @polystate/core

## 1.0.0

### Major Changes

- Typed `dispatch()`: `dispatch<K extends keyof A & string>(action: K, payload?: DispatchPayload<A[K]>)` — an unknown action name or a wrong payload type is now a compile-time error instead of a silent runtime `console.warn`. `ActionHandler<T, P>` also drops its `any` default in favor of inferred payload types.
- Removed `thunkMiddleware` (was a no-op — thunks are handled by `dispatch` directly) and removed `devToolsMiddleware` from core (superseded by `@polystate/devtools`, which adds time-travel, `maxAge`, and `JUMP_TO_ACTION` support).

### Patch Changes

- Replaced `T = any` defaults with `T = unknown` across `Middleware`, `Store`, and `Slice` types, and added explicit return types throughout.

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
