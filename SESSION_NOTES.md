# Polystate — Engineering Session Notes

> Session completed: March 2026  
> Starting commit: `b439c0a` (first commit)  
> Ending commit: `6f2a277`

---

## What Was Done

### 1. Bug Fixes (Critical)

#### `@polystate/angular` — `createAngularService` constructor

**Commit:** `1fcb3c6`  
The returned class constructor never initialised `this.store`, causing every call to `dispatch`, `select`, or `select$` to throw. Fixed by calling `createStore(initialState, actions)` in the constructor.

```typescript
// Before — store never assigned
class extends PolystateService<T> { constructor() { super(); } }

// After — store initialised on construction
class extends PolystateService<T> {
  constructor() {
    super();
    this.store = createStore(initialState, actions);
  }
}
```

#### `@polystate/angular` — `select$` subscription leak

**Commit:** `b4b5f44`  
`select$` created a `BehaviorSubject` and subscribed to the store observable but never cleaned up. Added `takeUntil(this.destroy$)` so all observables complete on `ngOnDestroy`.

#### `@polystate/core` — `distinctUntilChanged` sentinel bug

**Commit:** `b31e4b2`  
Used `Symbol('initial')` inside the closure; a new Symbol is created on every call, making `prev === Symbol('initial')` always `false` after the first emit. Fixed with an `initialized` boolean flag.

```typescript
// Before — always false
let prev = Symbol('initial');
// After — correct
let initialized = false;
let prev: S;
```

#### `@polystate/core` — `prefixActions` key pollution

**Commit:** `e2b9fae`  
Handlers were called with full store state (`TFull`) but the slice handlers expected only their own sub-state slice. Fixed to scope each handler to `fullState[prefix]`.

#### `@polystate/devtools` — time-travel `JUMP_TO_ACTION` handler

**Commit:** `00c539e`  
The `JUMP_TO_ACTION` Redux DevTools message handler was empty. Implemented time-travel by calling `store.setState(state)` with the historical snapshot.

---

### 2. New Features

#### `@polystate/core` — `pipe()` on Observable

**Commit:** `74c45ab`  
Added `pipe()` to the `Observable` interface and all operator implementations (`map`, `filter`, `distinctUntilChanged`, `take`), enabling fluent operator chaining.

```typescript
asObservable(store)
  .pipe(
    map((s) => s.todos),
    filter((todos) => todos.length > 0),
    take(3)
  )
  .subscribe(console.log);
```

#### `@polystate/generator-react` — real reducer serialisation

**Commits:** `585ed93`, `747ed9c`  
`generateReducers()` previously returned `return state` stubs. Now serialises actual action handler bodies from the `StoreDefinition` into Immer-compatible Redux Toolkit reducers.

#### `@polystate/generator-angular` — real reducer serialisation

**Commit:** `e50064e`  
Same fix for the Angular generator: `generateReducerHandlers()` now produces correct `on(Action, (state) => ...)` NgRx handlers that implement the actual action logic.

---

### 3. Examples

#### `examples/react-todo/`

**Commit:** `1e05320` (implicit in earlier work)  
Runtime adapter example using `@polystate/core` + `@polystate/react` directly.

#### `examples/angular-todo-generated/`

**Commits:** `3680fb1`, `e96ec36`  
Completed Angular 17 standalone app component with `importProvidersFrom` and correct module wiring. Serves as the golden reference output for `generator-angular`.

---

### 4. Test Infrastructure

#### Vitest setup for React hooks

**Commits:** `7312682`, `c88b396`  
Added `@vitejs/plugin-react`, path aliases, and `jest-dom` matchers so React hook tests work correctly in the jsdom environment.

#### Async/await migration

**Commits:** `2d07c76`, `789038f`  
Migrated all `done()` callback-style tests in `store.test.ts` to `async/await` for clarity and compatibility with modern Vitest.

#### Fix observer normalisation

**Commit:** `5adb215`  
`map`, `filter`, `distinctUntilChanged`, and `take` operators were inconsistent when passed a plain function subscriber. Normalised to always accept both `Observer` objects and plain functions.

#### Generator regression tests

**Commit:** `16afaab`  
Added regression tests covering `generateReduxStore`, `generateNgRxReducer`, and facade generation to lock in generator output shape.

---

### 5. Build & Config

#### TypeScript paths + devDependencies

**Commit:** `e50991c`  
Updated `tsconfig.json` paths to point to `dist/` for inter-package resolution. Added `@types/react`, `@angular/core`, and `rxjs` as root devDependencies so TypeScript is satisfied in all packages.

#### Build fixes (overload casts, return types)

**Commits:** `5b8e68d`, `a877f32`, `b7d6764`  
Fixed TypeScript strict-mode errors:

- Cast `asObservable` object literal to satisfy overload signatures
- Collapsed duplicate `getState` declarations into a single overloaded method
- Added explicit destructuring types in generator `extractActions` map callbacks

---

### 6. Consumer-Level Integration Tests

**Commit:** `6f2a277` — **51 tests, 3 files**

The final milestone: a separate Vitest config (`vitest.integration.config.ts`) that resolves every `@polystate/*` import to the compiled `dist/index.js`, mirroring what an app gets after `npm install`.

#### `tests/integration/core.integration.test.ts` — 22 tests

| Group      | Coverage                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| Store      | init, `getState` with selector, dispatch, `setState`, global/selective subscribe, unsubscribe, thunks, warn-on-unknown |
| Slices     | `createSlice` + `prefixActions` scoping; `composeSlices` with nested state                                             |
| Observable | `asObservable`, `map`, `filter`, `distinctUntilChanged`, `take`, `pipe` chain                                          |
| Middleware | `loggerMiddleware`, `persistMiddleware` save/load, custom middleware context                                           |

#### `tests/integration/react.integration.test.tsx` — 12 tests

| Hook / API           | Coverage                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `useStore`           | renders initial state, re-renders on every update                                        |
| `useSelector`        | returns selected slice, no re-render on unrelated change, multiple independent selectors |
| `useDispatch`        | dispatches to sibling components, stable reference across renders                        |
| `useSetState`        | partial merge without losing other keys                                                  |
| `createStoreHooks`   | pre-bound hooks factory                                                                  |
| `createStoreContext` | Provider + `useContextStore`, throws outside provider                                    |
| End-to-end TodoApp   | add / toggle / filter / remove scenario                                                  |

#### `tests/integration/angular.integration.test.ts` — 17 tests

| Group         | Coverage                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Factory       | `createAngularService` returns `PolystateService`, instance isolation                                   |
| `getState`    | full state, selector slice, after-dispatch snapshot, sequential accumulation                            |
| `dispatch`    | thenable return, toggle, remove (with `tick()` guard), `setFilter` isolation                            |
| `select$`     | initial emit, reactive on change, suppressed on unrelated change, reactive length, independent channels |
| `ngOnDestroy` | completes observables, no post-destroy emissions                                                        |
| End-to-end    | full workflow with `select$` live updates                                                               |

---

## Final Test Counts

| Suite       | Command                                            | Tests   |
| ----------- | -------------------------------------------------- | ------- |
| Unit        | `vitest run`                                       | **90**  |
| Integration | `vitest run --config vitest.integration.config.ts` | **51**  |
| **Total**   |                                                    | **141** |

All 141 tests pass, no failures, no skips.

---

## Notable Engineering Decisions

- **Two Vitest configs** — `vitest.config.ts` for source-level unit tests (fast feedback during dev), `vitest.integration.config.ts` for dist-resolved consumer tests (CI confidence).
- **No TestBed in integration tests** — Angular Ivy's JIT decorator machinery crashes on non-`@Injectable` classes. All service behaviour is fully testable with direct instantiation; `select()` (Angular Signals) requires DI context and is covered by unit tests.
- **`tick()` helper** — 1 ms `setTimeout` between back-to-back `addTodo` dispatches guards against `Date.now()` ID collisions in fast test runners.
- **`typeof .then`** instead of `instanceof Promise` — zone.js wraps native `Promise` into `ZoneAwarePromise`, making the `instanceof` check unreliable.
- **Zero new runtime dependencies** — `@polystate/core` stays at 0 runtime dependencies throughout all changes.
