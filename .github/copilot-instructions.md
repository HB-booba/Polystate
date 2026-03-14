# Polystate — Copilot Instructions

## Project Overview

Polystate is a **framework-agnostic state management monorepo** with two modes:

1. **Runtime adapters** — use `@polystate/core` directly in React or Angular
2. **Code generation** — define a store once, generate native Redux (React) or NgRx (Angular) code from it

The monorepo uses **Nx + npm workspaces**, builds with **tsup**, tests with **Vitest**, and is written in **TypeScript strict mode** throughout.

---

## Monorepo Structure

```
polystate/
├── packages/
│   ├── core/               # Framework-agnostic core — Signal, Store, middleware, observable, slice
│   ├── react/              # React 18+ adapter — hooks using useSyncExternalStore
│   ├── angular/            # Angular 17+ adapter — PolystateService base class
│   ├── definition/         # StoreDefinition type + validator + extractActions
│   ├── generator-react/    # Generates Redux + RTK hooks from a StoreDefinition
│   ├── generator-angular/  # Generates NgRx store from a StoreDefinition
│   ├── cli/                # CLI: `polystate generate <file> --react --angular`
│   └── devtools/           # Redux DevTools bridge middleware
├── examples/
│   ├── react-todo/                  # Runtime adapter example
│   ├── react-todo-generated/        # Output of generator-react (manually written, IS the reference)
│   └── angular-todo-generated/      # Output of generator-angular (manually written, IS the reference)
└── .github/
    └── workflows/ci-cd.yml
```

---

## Core Architecture

### `@polystate/core`

- **`Signal<T>`** — reactive primitive with value getter/setter and subscriber set. Only notifies if value changes (`!==`).
- **`Store<T>`** — wraps a Signal, holds an `ActionMap<T>`, supports global and selective subscriptions, async dispatch, thunks, and middleware pipeline.
- **`createStore(initialState, actions, options?)`** — factory for Store.
- **`createSlice(initialState, reducers, options?)`** — modular slice, combine with `prefixActions()`.
- **`asObservable(store, selector?)`** — converts store to RxJS-compatible observable. Includes `map`, `filter`, `distinctUntilChanged`, `take` operators.
- **Middleware** — runs AFTER state is updated. Context: `{ action, payload, prevState, nextState, dispatch }`. Built-ins: `loggerMiddleware`, `persistMiddleware`, `devToolsMiddleware`.

### `@polystate/react`

- All hooks use `useSyncExternalStore` (React 18+). Never use `useState` to mirror store state.
- `useStore(store)` — subscribes to full state.
- `useSelector(store, selector)` — subscribes to a slice; only re-renders when selected value changes.
- `useDispatch(store)` — returns `{ dispatch }` memoized with `useCallback`.
- `useSetState(store)` — returns partial update function.
- `createStoreHooks(store)` — pre-binds all hooks to a specific store.
- `createStoreContext(store)` — creates a React Context Provider + `useContextStore()` hook.

### `@polystate/angular`

- **`PolystateService<T>`** — abstract base class. Requires `this.store` to be initialized before any method is called.
  - `select(selector)` — returns Angular `Signal` (from `@angular/core`).
  - `select$(selector)` — returns RxJS `Observable` via `BehaviorSubject` + `distinctUntilChanged`.
  - `dispatch(action, payload?)` — delegates to store.
- **`createAngularService(initialState, actions)`** — factory that returns a concrete subclass of `PolystateService` with the store properly initialized. **This is the main gap to fix.**

### `@polystate/definition`

- `StoreDefinition<TState>` — `{ name, initialState, actions, description? }`
- `validateStoreDefinition(def)` — returns `{ valid, errors, warnings }`. Validates name format, required fields, action types.
- `normalizeStoreDefinition(def)` — ensures all fields are present.
- `extractActions(def)` — returns `Array<{ name, handler, paramCount }>`. `paramCount` is `handler.length` — used by generators to know if an action takes a payload.

### `@polystate/generator-react` and `@polystate/generator-angular`

These generators take a `StoreDefinition` and produce TypeScript source strings. The output must match the manually written examples in `examples/react-todo-generated/` and `examples/angular-todo-generated/` — those examples ARE the specification for what the generators should produce.

**Current state**: the generators produce correct file structure and selectors, but `generateReducers()` returns stubs (`return state`). The fix is to serialize the action handler bodies from the `StoreDefinition` into the generated reducer code.

### `@polystate/cli`

Reads a `.ts` definition file via `require()`, validates it, normalizes it, calls the generators, and writes files. Already functional in structure — depends on generators being correct.

---

## Key Patterns & Conventions

### TypeScript

- Strict mode. No `any` unless explicitly justified.
- Generic type params: `T` for store state, `S` for selected slice.
- Action handlers: `(state: T, payload?: unknown) => T` — always return a new state object (immutable).
- Prefer type inference over explicit annotation where types are clear.

### State Immutability

All action handlers must return a **new object**. Never mutate state directly.

```typescript
// Correct
addTodo: (state, title: string) => ({
  ...state,
  todos: [...state.todos, { id: Date.now(), title, done: false }],
})

// Wrong — mutation
addTodo: (state, title: string) => {
  state.todos.push(...); // never
  return state;
}
```

### Middleware Order

Middleware runs AFTER state is already updated in the Signal. It cannot block or modify the state — it is for side effects (logging, persistence, devtools).

### Generator Output Spec

The generated code from `generator-react` must match `examples/react-todo-generated/src/store/store.ts` and `hooks.ts`. The generated code from `generator-angular` must match `examples/angular-todo-generated/src/app/store/`. These examples are handwritten references — treat them as golden output.

### Selective Subscription (important for perf)

The Store tracks `selectiveSubscribers` as a `Map<Selector, Set<Subscriber>>`. On each dispatch, it compares `selector(prevState) !== selector(nextState)` — only notifies if changed. This is the same contract as `useSyncExternalStore`.

---

## Testing

- Framework: **Vitest** with jsdom environment.
- React component tests: **@testing-library/react**.
- All tests are co-located with source files (`*.test.ts` or `*.test.tsx`).
- Test pattern: `describe` → `it` with `beforeEach` to reset store. Use `vi.fn()` for listeners, `vi.spyOn` for console methods.
- Async dispatch: always `await store.dispatch(...)` or chain `.then()`.
- Never test implementation details — test observable behavior (state changes, subscriber calls).

---

## Build & Scripts

```bash
npm run build    # tsup builds all packages via Nx
npm run test     # vitest runs all *.test.ts files
npm run lint     # eslint across all packages
npm run format   # prettier
```

Each package exports ESM + CJS dual format. Types are generated automatically by tsup.

---

## Critical Bugs to Fix (in priority order)

1. **`createAngularService` in `packages/angular/src/service.ts`** — the returned class constructor never initializes `this.store`. Any call to `dispatch`, `select`, or `select$` will throw. Must call `createStore(initialState, actions)` and assign to `this.store` in the constructor.

2. **`generateReducers()` in `packages/generator-react/src/generator.ts`** — returns `return state` for all actions. Must serialize the actual action handler logic from the `StoreDefinition` into Redux Toolkit–compatible reducer code (using Immer-compatible mutations or spread patterns).

3. **`generateReducerHandlers()` in `packages/generator-angular/src/generator.ts`** — same issue. Must produce correct `on(Action, (state) => ...)` handlers that implement the actual action logic.

4. **`distinctUntilChanged` in `packages/core/src/observable.ts`** — uses `Symbol('initial')` inside the closure but creates a new Symbol on every call to `prev === Symbol('initial')`, which is always false after the first emit. Fix: use a sentinel constant or `undefined` with an `initialized` flag.

5. **`select$` in `packages/angular/src/service.ts`** — creates a `BehaviorSubject` and subscribes to the store observable but never unsubscribes. Will leak on service destroy. Add cleanup via `takeUntil(this.destroy$)` pattern or track the subscription.

6. **Time-travel in `packages/devtools/src/middleware.ts`** — the `JUMP_TO_ACTION` handler is empty. For real time-travel, the store needs to expose a `setState(state)` method (it already does) that the devtools can call.

---

## What NOT to do

- Do not use `useEffect` + `useState` to subscribe to a Polystate store in React — use `useSyncExternalStore` exclusively.
- Do not import `rxjs` in `@polystate/core` or `@polystate/angular` — the Observable implementation is custom and RxJS-compatible but does not depend on RxJS.
- Do not add runtime dependencies to `@polystate/core` — it must stay at 0 dependencies.
- Do not mutate state in action handlers.
- Do not generate code that calls the Polystate runtime in the generated Redux/NgRx output — generated code is standalone and must only depend on `@reduxjs/toolkit` (React) or `@ngrx/store` (Angular).
