# Polystate — Full Documentation

> For a quick overview see the [README](../README.md).  
> This file is the complete reference for all Polystate APIs, patterns, and internals.

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [`createStore` & Store API](#2-createstore--store-api)
3. [Action Handlers](#3-action-handlers)
4. [Subscriptions](#4-subscriptions)
5. [Thunks — Async Actions](#5-thunks--async-actions)
6. [Middleware](#6-middleware)
7. [Slices — Composable State](#7-slices--composable-state)
8. [Observables (RxJS-compatible)](#8-observables-rxjs-compatible)
9. [React Adapter (`@polystate/react`)](#9-react-adapter-polystatesreact)
10. [Angular Adapter (`@polystate/angular`)](#10-angular-adapter-polystateangular)
11. [DevTools (`@polystate/devtools`)](#11-devtools-polystatedevtools)
12. [Store Definition (`@polystate/definition`)](#12-store-definition-polystatedefinition)
13. [Code Generation — CLI](#13-code-generation--cli)
14. [Code Generation — React Generator](#14-code-generation--react-generator)
15. [Code Generation — Angular Generator](#15-code-generation--angular-generator)
16. [TypeScript Patterns](#16-typescript-patterns)
17. [Performance Notes](#17-performance-notes)
18. [Architecture Internals](#18-architecture-internals)

---

## 1. Core Concepts

### Signal

`Signal<T>` is the reactive primitive at the base of everything. It wraps a value and notifies subscribers only when the value actually changes (`!==` comparison).

```typescript
import { Signal } from '@polystate/core';

const sig = new Signal(0);
sig.subscribe((v) => console.log('value:', v));

sig.set(1); // notifies — value changed
sig.set(1); // silent — same value
```

### Store

`Store<T>` wraps a Signal, holds an `ActionMap<T>`, and adds:

- Named action dispatch with middleware pipeline
- Global and selective (per-selector) subscriptions
- Async/thunk dispatch
- `reset()` and `destroy()` lifecycle

### Two Execution Paths

```
Path 1: Code Generation
  store.definition.ts  →  @polystate/cli  →  Redux / NgRx files

Path 2: Runtime Adapters
  @polystate/core  →  @polystate/react  OR  @polystate/angular
```

---

## 2. `createStore` & Store API

```typescript
import { createStore } from '@polystate/core';

const store = createStore(initialState, actions, options?);
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `initialState` | `T` | The initial state value (any plain object) |
| `actions` | `ActionMap<T>` | Map of pure functions `(state, payload?) => newState` |
| `options` | `StoreOptions` | Optional: `{ logging?, middleware? }` |

### `StoreOptions`

```typescript
interface StoreOptions<T> {
  logging?: boolean;             // attaches loggerMiddleware automatically
  middleware?: Middleware<T>[];   // custom middleware array
}
```

### Store Methods

| Method | Signature | Notes |
|---|---|---|
| `getState()` | `() => T` | Full state snapshot |
| `getState(selector)` | `(sel: (s: T) => S) => S` | Read a slice |
| `dispatch(action, payload?)` | `(string \| ThunkFn, any?) => Promise<void>` | Dispatch named action or thunk |
| `setState(patch)` | `(Partial<T>) => void` | Bypass action handlers — direct patch |
| `subscribe(listener)` | `(cb: (s: T) => void) => Unsubscriber` | Global — fires on every state change |
| `subscribe(selector, listener)` | `(sel, cb) => Unsubscriber` | Selective — fires only when `sel(state)` changes |
| `getActionNames()` | `() => string[]` | List registered action names |
| `addMiddleware(mw)` | `(mw: Middleware<T>) => void` | Attach middleware after creation |
| `reset()` | `() => void` | Restore `initialState`, notify all subscribers |
| `destroy()` | `() => void` | Clear all subscribers, block future dispatches |

### Full Example

```typescript
import { createStore } from '@polystate/core';

interface TodoState {
  todos: Array<{ id: number; text: string; done: boolean }>;
  filter: 'all' | 'active' | 'done';
  loading: boolean;
}

const store = createStore<TodoState>(
  { todos: [], filter: 'all', loading: false },
  {
    addTodo:    (s, text: string)  => ({ ...s, todos: [...s.todos, { id: Date.now(), text, done: false }] }),
    toggle:     (s, id: number)    => ({ ...s, todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }),
    remove:     (s, id: number)    => ({ ...s, todos: s.todos.filter((t) => t.id !== id) }),
    setFilter:  (s, f: TodoState['filter']) => ({ ...s, filter: f }),
    setLoading: (s, loading: boolean)       => ({ ...s, loading }),
  },
  { logging: true }
);

await store.dispatch('addTodo', 'Buy milk');
console.log(store.getState().todos);
```

---

## 3. Action Handlers

Action handlers are **pure functions**. They receive the current state (and optionally a payload) and must return a **new state object** — never mutate.

```typescript
// ✅ Correct — returns new object
addTodo: (state, title: string) => ({
  ...state,
  todos: [...state.todos, { id: Date.now(), title, done: false }],
})

// ❌ Wrong — mutates state
addTodo: (state, title: string) => {
  state.todos.push({ id: Date.now(), title, done: false }); // mutation!
  return state;
}
```

### No-payload Actions

If the handler only takes `state`, dispatch without a second argument:

```typescript
const store = createStore(
  { loading: false },
  {
    startLoading: (s) => ({ ...s, loading: true }),
    stopLoading:  (s) => ({ ...s, loading: false }),
  }
);

await store.dispatch('startLoading');
```

---

## 4. Subscriptions

### Global Subscription

Fires on every state change regardless of what changed:

```typescript
const unsub = store.subscribe((state) => {
  console.log('state changed:', state);
});
unsub(); // unsubscribe
```

### Selective Subscription

Fires **only** when the selected value changes (`!==`):

```typescript
const unsub = store.subscribe(
  (s) => s.filter,                    // selector
  (filter) => renderFilter(filter),   // listener — only re-runs when filter changes
);
```

This is the same contract as React's `useSyncExternalStore` and allows components or services to avoid unnecessary re-renders.

---

## 5. Thunks — Async Actions

Dispatch a function instead of a string to get access to `dispatch` and `getState`. Thunks are fully `async/await` compatible.

```typescript
const loadTodos = async (dispatch: StoreDispatch, getState: () => TodoState) => {
  await dispatch('setLoading', true);
  try {
    const data: Todo[] = await fetch('/api/todos').then((r) => r.json());
    await dispatch('setTodos', data);
  } catch (err) {
    await dispatch('setError', String(err));
  } finally {
    await dispatch('setLoading', false);
  }
};

await store.dispatch(loadTodos);
// or fire-and-forget:
store.dispatch(loadTodos);
```

Thunks can dispatch other thunks:

```typescript
const withAuth = async (dispatch, getState) => {
  if (!getState().token) await dispatch(refreshToken);
  await dispatch(loadTodos);
};
```

---

## 6. Middleware

Middleware runs **after** the state is already updated in the Signal. It cannot block or modify the state — it is purely for side effects.

### Middleware Signature

```typescript
type Middleware<T> = (ctx: MiddlewareContext<T>) => void | Promise<void>;

interface MiddlewareContext<T> {
  action: string;
  payload: unknown;
  prevState: T;
  nextState: T;
  dispatch: StoreDispatch;
}
```

### Built-in Middleware

```typescript
import {
  loggerMiddleware,
  persistMiddleware,
  loadPersistedState,
} from '@polystate/core';

const key = 'myapp:todos';
const saved = loadPersistedState<TodoState>(key);

const store = createStore(saved ?? initialState, actions, {
  middleware: [
    loggerMiddleware(),            // console.group for every action
    persistMiddleware(key),        // saves nextState to localStorage on every dispatch
  ],
});
```

### Custom Middleware

```typescript
const analyticsMiddleware: Middleware<AppState> = ({ action, payload, nextState }) => {
  analytics.track(action, { payload, todos: nextState.todos.length });
};

store.addMiddleware(analyticsMiddleware);
```

### Middleware Order

Middleware runs in array order after state update. If using `createStore` options and later `addMiddleware`, the dynamically added middleware runs after the static ones.

---

## 7. Slices — Composable State

Slices let you define modular pieces of state that can be combined into a larger store.

```typescript
import { createSlice, prefixActions, composeSlices, createStore } from '@polystate/core';

const counterSlice = createSlice(
  { count: 0 },
  {
    inc: (s) => ({ count: s.count + 1 }),
    dec: (s) => ({ count: s.count - 1 }),
    set: (s, n: number) => ({ count: n }),
  }
);

const labelSlice = createSlice(
  { text: 'default' },
  { update: (s, t: string) => ({ text: t }) }
);

// composeSlices extracts { initialState, actions } from each slice
const [counterPart, labelPart] = composeSlices([counterSlice, labelSlice]);

// prefixActions namespaces: 'counter/inc', 'label/update', etc.
const store = createStore(
  { counter: counterPart.initialState, label: labelPart.initialState },
  {
    ...prefixActions(counterPart.actions, 'counter'),
    ...prefixActions(labelPart.actions, 'label'),
  }
);

await store.dispatch('counter/inc');
await store.dispatch('label/update', 'hello');
// → { counter: { count: 1 }, label: { text: 'hello' } }
```

---

## 8. Observables (RxJS-compatible)

`asObservable` converts any store into a zero-dependency observable. Includes built-in operators: `map`, `filter`, `distinctUntilChanged`, `take`. The interface is compatible with RxJS — you can pipe RxJS operators through the same chain.

```typescript
import { asObservable, map, filter, distinctUntilChanged, take } from '@polystate/core';

// Subscribe to full state
asObservable(store).subscribe((state) => console.log(state));

// Selector variant — only emits when the selector output changes
asObservable(store, (s) => s.todos.length)
  .subscribe((n) => console.log(n, 'todos'));

// Operator chain
asObservable(store, (s) => s.todos)
  .pipe(
    map((todos) => todos.filter((t) => !t.done)),
    filter((active) => active.length > 0),
    distinctUntilChanged((a, b) => a.length === b.length),
    take(10),
  )
  .subscribe((activeTodos) => renderList(activeTodos));
```

### `distinctUntilChanged` behaviour

The first emission is always passed through. Subsequent emissions are suppressed if the comparator returns `true` (equal). Default comparator is `===`.

---

## 9. React Adapter (`@polystate/react`)

### Installation

```bash
npm install @polystate/core @polystate/react
```

### Hooks

All hooks use `useSyncExternalStore` (React 18+) — safe for concurrent rendering and hydration.

| Hook | Purpose |
|---|---|
| `useStore(store)` | Subscribe to full state |
| `useSelector(store, sel)` | Subscribe to a slice; skip re-renders when unchanged |
| `useDispatch(store)` | Returns stable `{ dispatch }` memoized with `useCallback` |
| `useSetState(store)` | Returns `(patch: Partial<T>) => void` for direct partial updates |
| `createStoreHooks(store)` | Pre-binds all hooks to a specific store — preferred pattern |
| `createStoreContext(store)` | Creates React Context `Provider` + `useContextStore()` |

### Option A — Global hooks

```tsx
import { useSelector, useDispatch } from '@polystate/react';
import { todoStore } from './store';

function TodoList() {
  const todos = useSelector(todoStore, (s) => s.todos);
  const { dispatch } = useDispatch(todoStore);

  return (
    <>
      {todos.map((t) => <li key={t.id}>{t.text}</li>)}
      <button onClick={() => dispatch('addTodo', 'New task')}>Add</button>
    </>
  );
}
```

### Option B — Pre-bound hooks (recommended)

```tsx
import { createStoreHooks } from '@polystate/react';
import { todoStore } from './store';

export const {
  useStore:    useTodoStore,
  useSelector: useTodoSelector,
  useDispatch: useTodoDispatch,
} = createStoreHooks(todoStore);

// In any component — no store import needed
function TodoItem({ id }) {
  const todo = useTodoSelector((s) => s.todos.find((t) => t.id === id));
  const { dispatch } = useTodoDispatch();
  return <button onClick={() => dispatch('toggle', id)}>{todo?.text}</button>;
}
```

### Option C — React Context

Useful when the store should be scoped to a subtree (e.g. per-route or per-modal).

```tsx
import { createStoreContext } from '@polystate/react';
import { todoStore } from './store';

const { Provider, useContextStore } = createStoreContext(todoStore);

function App() {
  return (
    <Provider>
      <TodoList />
    </Provider>
  );
}

function TodoList() {
  const store = useContextStore();
  const todos = useSelector(store, (s) => s.todos);
  // ...
}
```

---

## 10. Angular Adapter (`@polystate/angular`)

### Installation

```bash
npm install @polystate/core @polystate/angular
```

### `createAngularService`

The recommended way to create a Polystate-backed Angular service. Returns a concrete subclass of `PolystateService` with the store initialized.

```typescript
import { Injectable } from '@angular/core';
import { createAngularService } from '@polystate/angular';

interface TodoState {
  todos: Array<{ id: number; title: string; done: boolean }>;
  filter: 'all' | 'active' | 'completed';
}

const initialState: TodoState = { todos: [], filter: 'all' };

const actions = {
  addTodo:    (s: TodoState, title: string) => ({ ...s, todos: [...s.todos, { id: Date.now(), title, done: false }] }),
  toggleTodo: (s: TodoState, id: number)    => ({ ...s, todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }),
  removeTodo: (s: TodoState, id: number)    => ({ ...s, todos: s.todos.filter((t) => t.id !== id) }),
  setFilter:  (s: TodoState, filter: TodoState['filter']) => ({ ...s, filter }),
};

@Injectable({ providedIn: 'root' })
export class TodoService extends createAngularService(initialState, actions) {}
```

### `PolystateService` Methods

```typescript
// Angular Signal — reactive in template expressions
todos = this.select((s) => s.todos);

// RxJS Observable — for async pipe or manual subscriptions
todos$ = this.select$((s) => s.todos);

// Dispatch an action
this.dispatch('addTodo', 'Buy milk');

// Read a snapshot
const count = this.getState((s) => s.todos.length);

// Full state snapshot
const state = this.getState();
```

### Subscription Lifecycle

All `select$` subscriptions use `takeUntil(this.destroy$)` and are automatically cleaned up on `ngOnDestroy`. No manual unsubscription needed.

### Component Example

```typescript
@Component({
  selector: 'app-todos',
  template: `
    <div *ngFor="let todo of todos$ | async">
      <span [class.done]="todo.done">{{ todo.title }}</span>
      <button (click)="service.dispatch('toggleTodo', todo.id)">Toggle</button>
      <button (click)="service.dispatch('removeTodo', todo.id)">Remove</button>
    </div>
    <input #input (keyup.enter)="service.dispatch('addTodo', input.value); input.value = ''">
  `,
  standalone: true,
  imports: [AsyncPipe, NgFor, NgClass],
})
export class TodosComponent {
  todos$ = this.service.select$((s) => s.todos);
  constructor(public service: TodoService) {}
}
```

---

## 11. DevTools (`@polystate/devtools`)

Connects any Polystate store to the [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools).

### Setup

```typescript
import { createStore } from '@polystate/core';
import { connectDevTools } from '@polystate/devtools';

const store = createStore(initialState, actions);
connectDevTools(store, { name: 'My App' });

// Or chain:
const store = connectDevTools(
  createStore(initialState, actions),
  { name: 'My App' }
);
```

### Features

- Sends `@@INIT` with initial state on connection
- Records every action (name + payload) in the DevTools timeline
- Time-travel: clicking a past action in DevTools calls `store.setState(snapshot)` to restore state
- Name your store with `{ name: 'My App Store' }` to distinguish multiple stores in DevTools

### With Angular

```typescript
@Injectable({ providedIn: 'root' })
export class AppService extends createAngularService(initialState, actions) {
  constructor() {
    super();
    connectDevTools(this.store, { name: 'App' });
  }
}
```

---

## 12. Store Definition (`@polystate/definition`)

Used for code generation. A `StoreDefinition` is a plain, serializable description of your store that generators consume.

### Type

```typescript
interface StoreDefinition<TState = unknown> {
  name: string;           // camelCase, used in class/variable names
  initialState: TState;   // the initial state value
  actions: ActionMap<TState>; // map of pure action handlers
  asyncActions?: AsyncActionMap; // optional async thunks (for NgRx Effects)
  description?: string;   // optional description for generated comments
}
```

### Validation

```typescript
import { validateStoreDefinition } from '@polystate/definition';

const result = validateStoreDefinition(myDef);
// result.valid: boolean
// result.errors: string[]
// result.warnings: string[]
```

Validation checks:

- `name` is a non-empty camelCase string
- `initialState` is a plain object
- All `actions` entries are functions with at least one parameter (state)
- No duplicate action names

### `extractActions`

Used internally by generators to enumerate actions with parameter metadata:

```typescript
import { extractActions } from '@polystate/definition';

const actions = extractActions(myDef);
// [{ name: 'addTodo', handler: fn, paramCount: 2 }, ...]
// paramCount >= 2 means the action takes a payload
```

---

## 13. Code Generation — CLI

### Install

```bash
npm install --save-dev @polystate/cli
```

### Commands

#### `generate`

```bash
npx polystate generate <definitionFile> [options]

Options:
  --react            Generate React Redux code (store.ts, hooks.ts, types.ts)
  --angular          Generate NgRx code (state.ts, actions.ts, reducer.ts, selectors.ts, facade.ts, store.module.ts)
  --out-dir <path>   Output directory (default: src/store)
  --overwrite        Overwrite existing files
```

Examples:

```bash
npx polystate generate store.definition.ts --react
npx polystate generate store.definition.ts --angular
npx polystate generate store.definition.ts --react --angular --out-dir src/app/store
```

#### `validate`

```bash
npx polystate validate <definitionFile>
```

Validates the definition without generating any files. Useful in a pre-commit hook.

#### `check`

```bash
npx polystate check <definitionFile> [options]

Options:
  --react            Check React files
  --angular          Check Angular files
  --store-dir <path> Directory to check (default: src/store)
```

Returns exit code `1` if generated files are older than the definition. Useful in CI:

```yaml
# .github/workflows/ci.yml
- name: Check generated files are current
  run: npx polystate check store.definition.ts --react --store-dir src/store
```

### How the CLI Works

1. **Parse** — reads the definition file with `ts-morph` (AST, no code execution)
2. **Validate** — structurally validates the parsed AST
3. **Runtime validate** — optionally loads the file with dynamic `import()` for deeper checks
4. **Generate** — calls `@polystate/generator-react` and/or `@polystate/generator-angular`
5. **Write** — writes files to `--out-dir`, checks `--overwrite` flag

---

## 14. Code Generation — React Generator

### What Gets Generated

**`store.ts`** — Redux Toolkit slice + configureStore + middleware:

```typescript
import { createSlice, configureStore, PayloadAction } from '@reduxjs/toolkit';

const todoSlice = createSlice({
  name: 'todo',
  initialState,
  reducers: {
    addTodo: (state, action: PayloadAction<string>) => {
      // actual handler logic from your definition
    },
    toggleTodo: (state, action: PayloadAction<number>) => { ... },
    // ...
  },
});

export const store = configureStore({
  reducer: { todo: todoSlice.reducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(logger, persistMiddleware),
});
```

**`hooks.ts`** — typed hooks per field and action:

```typescript
export function useTodos() {
  return useSelector((state: RootState) => state.todo.todos);
}

export function useFilter() {
  return useSelector((state: RootState) => state.todo.filter);
}

export function useTodoDispatch() {
  const dispatch = useAppDispatch();
  return {
    addTodo: (title: string) => dispatch(todoActions.addTodo(title)),
    toggleTodo: (id: number) => dispatch(todoActions.toggleTodo(id)),
    // ...
  };
}

// Pattern-based derived hooks (generated when todos + filter fields exist)
export function useFilteredTodos() {
  const todos = useTodos();
  const filter = useFilter();
  if (filter === 'active') return todos.filter((t) => !t.done);
  if (filter === 'completed') return todos.filter((t) => !!t.done);
  return todos;
}
```

**`types.ts`** — TypeScript interfaces inferred from `initialState`:

```typescript
export interface TodoState {
  todos: Array<{ id: number; title: string; done: boolean }>;
  filter: 'all' | 'active' | 'completed';
}
```

### Generator API (programmatic use)

```typescript
import { generateReduxStore, generateHooks, generateTypes } from '@polystate/generator-react';

const storeCode  = generateReduxStore(storeDefinition);
const hooksCode  = generateHooks(storeDefinition);
const typesCode  = generateTypes(storeDefinition);
```

---

## 15. Code Generation — Angular Generator

### What Gets Generated

**`state.ts`** — TypeScript interface:

```typescript
export interface TodoState {
  todos: Array<{ id: number; title: string; done: boolean }>;
  filter: 'all' | 'active' | 'completed';
}
```

**`actions.ts`** — NgRx typed action creators:

```typescript
export const addTodo = createAction('[Todo] addTodo', props<{ payload: string }>());
export const toggleTodo = createAction('[Todo] toggleTodo', props<{ payload: number }>());
export const setFilter = createAction('[Todo] setFilter', props<{ payload: 'all' | 'active' | 'completed' }>());
```

**`reducer.ts`** — actual handler logic from the definition:

```typescript
export const todoReducer = createReducer(
  initialState,
  on(TodoActions.addTodo, (state, { payload }) => {
    const title = payload;
    return { ...state, todos: [...state.todos, { id: Date.now(), title, done: false }] };
  }),
  on(TodoActions.toggleTodo, (state, { payload }) => {
    const id = payload;
    return { ...state, todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) };
  }),
  // ...
);
```

**`selectors.ts`** — memoized selectors per field:

```typescript
export const selectTodoState = createFeatureSelector<TodoState>('todo');
export const selectTodos  = createSelector(selectTodoState, (state) => state.todos);
export const selectFilter = createSelector(selectTodoState, (state) => state.filter);
```

**`facade.ts`** — injectable service with typed methods and observables:

```typescript
@Injectable({ providedIn: 'root' })
export class TodoFacade {
  todos$:  Observable<TodoState['todos']>  = this.store.pipe(select(selectTodos));
  filter$: Observable<TodoState['filter']> = this.store.pipe(select(selectFilter));

  constructor(private store: Store<{ todo: TodoState }>) {}

  addTodo(payload: string): void   { this.store.dispatch(TodoActions.addTodo({ payload })); }
  toggleTodo(payload: number): void { this.store.dispatch(TodoActions.toggleTodo({ payload })); }
}
```

**`store.module.ts`** — Angular module wiring:

```typescript
@NgModule({
  imports: [StoreModule.forFeature('todo', todoReducer)],
})
export class TodoStoreModule {}
```

### Generator API

```typescript
import {
  generateNgRxStateFromAST,
  generateNgRxActionsFromAST,
  generateNgRxReducerFromAST,
  generateNgRxSelectorsFromAST,
  generateAngularFacadeFromAST,
  generateNgRxEffectsFromAST,
  generateStoreModule,
} from '@polystate/generator-angular';
```

---

## 16. TypeScript Patterns

### Strict Typing for Store State

```typescript
interface AppState {
  user: { id: string; name: string } | null;
  items: Array<{ id: number; label: string }>;
  status: 'idle' | 'loading' | 'error';
}

const store = createStore<AppState>(
  { user: null, items: [], status: 'idle' },
  {
    setUser:   (s, user: AppState['user'])     => ({ ...s, user }),
    addItem:   (s, label: string)              => ({ ...s, items: [...s.items, { id: Date.now(), label }] }),
    setStatus: (s, status: AppState['status']) => ({ ...s, status }),
  }
);
```

### Using `satisfies` with StoreDefinition

```typescript
import type { StoreDefinition } from '@polystate/definition';

export default {
  name: 'todo',
  initialState: { todos: [] as Todo[], filter: 'all' as Filter },
  actions: {
    addTodo: (state, title: string) => ({ ... }),
  },
} satisfies StoreDefinition;
// ✅ Full type-check — TypeScript will catch missing/wrong fields
// ✅ Type is narrowed (not widened to StoreDefinition)
```

### Inferred State Type from Store

```typescript
import { createStore } from '@polystate/core';

const store = createStore({ count: 0, name: '' }, { /* actions */ });

type AppState = ReturnType<typeof store.getState>;
// → { count: number; name: string }
```

### Type-safe `useSelector`

```typescript
const count = useSelector(store, (s) => s.count); // → number
const name  = useSelector(store, (s) => s.name);  // → string
```

### Type-safe `dispatch`

Action names are validated at the TypeScript level — dispatching a non-existent action is a compile error when using the generic `Store<T>` type.

---

## 17. Performance Notes

Benchmarked on Apple M-series (Node.js 20):

| Operation | Throughput |
|---|---|
| `getState()` | ~23 M ops/sec |
| `dispatch` no subscribers | ~3.2 M ops/sec |
| `setState` no subscribers | ~6.2 M ops/sec |
| `reset()` | ~6.7 M ops/sec |
| `subscribe + unsubscribe` | ~5.4 M ops/sec |
| `dispatch` with 100 global subscribers | ~225 K ops/sec |
| `dispatch` with 100 selective subscribers (unchanged) | ~480 K ops/sec |

### Why Selective Subscriptions Are Faster at Scale

Global subscribers run on every dispatch. Selective subscribers compare `selector(prevState) !== selector(nextState)` first — if unchanged, the listener is not called. This is the same optimization as React's `memo` + `useSyncExternalStore`.

### Bundle Sizes (gzipped)

| Package | Gzipped |
|---|---|
| `@polystate/core` | < 1.5 KB |
| `@polystate/react` | < 0.5 KB |
| `@polystate/angular` | < 1.0 KB |

---

## 18. Architecture Internals

### Signal → Store Relationship

```
Signal<T>
  └── value: T
  └── subscribers: Set<(v: T) => void>
        ↓
Store<T>
  └── signal: Signal<T>            — holds state
  └── initialState: T              — for reset()
  └── actions: ActionMap<T>        — named handlers
  └── middleware: Middleware<T>[]  — post-dispatch pipeline
  └── globalSubscribers: Set       — called on every dispatch
  └── selectiveSubscribers: Map<Selector, Set<Subscriber>>
```

### Dispatch Flow

```
store.dispatch('addTodo', 'Buy milk')
  │
  ├─ 1. Look up handler: actions['addTodo']
  ├─ 2. Compute nextState = handler(currentState, 'Buy milk')
  ├─ 3. signal.set(nextState)                — notifies Signal subscribers
  ├─ 4. Notify globalSubscribers(nextState)
  ├─ 5. For each selectiveSubscriber:
  │      if selector(prevState) !== selector(nextState) → notify
  └─ 6. Run middleware pipeline: { action, payload, prevState, nextState, dispatch }
```

### AST-based Code Generation Pipeline

```
store.definition.ts
  │
  ├─ ts-morph AST parse (no code execution)
  │    → StoreAST { name, fields[], actions[], asyncActions[] }
  │
  ├─ validateStoreDefinition
  │
  ├─ Optional: dynamic import() for runtime validation
  │
  └─ Generator functions
       ├─ generateReduxStore(ast)     → store.ts
       ├─ generateHooks(ast)          → hooks.ts
       ├─ generateTypes(ast)          → types.ts
       │
       ├─ generateNgRxStateFromAST(ast)     → state.ts
       ├─ generateNgRxActionsFromAST(ast)   → actions.ts
       ├─ generateNgRxReducerFromAST(ast)   → reducer.ts
       ├─ generateNgRxSelectorsFromAST(ast) → selectors.ts
       ├─ generateAngularFacadeFromAST(ast) → facade.ts
       └─ generateNgRxEffectsFromAST(ast)   → effects.ts
```

### Observable Implementation

The custom `asObservable` is intentionally RxJS-compatible but has zero RxJS dependency. It wraps a store subscription in an object with `.subscribe(fn)` and `.pipe(...operators)`.

The `pipe` evaluates lazily — operators are stacked and only executed when `subscribe` is called. `distinctUntilChanged` uses an `initialized` boolean flag (not `Symbol`) to safely track its "first emission" state.

### Middleware Timing

Middleware runs **after** state is written to the Signal. This is a deliberate design choice:

- It keeps middleware simple (no need to call `next()`)
- It means middleware cannot block or cancel state updates
- It is consistent with Redux DevTools expectations (which log the final state, not intent)
