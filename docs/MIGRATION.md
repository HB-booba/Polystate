# Migration Guide

Migrate to Polystate from Redux, NgRx, React Context, or Zustand/Jotai. Polystate works in two modes:

- **Runtime adapter** — drop-in replacement using `@polystate/core` + `@polystate/react` / `@polystate/angular`
- **Code generation** — define a store once, generate native Redux or NgRx code

---

## Table of Contents

1. [When to migrate](#when-to-migrate)
2. [Prerequisites](#prerequisites)
3. [From Redux Slice (React)](#from-redux-slice-react)
4. [From NgRx (Angular)](#from-ngrx-angular)
5. [From React Context + useReducer](#from-react-context--usereducer)
6. [From Zustand or Jotai](#from-zustand-or-jotai)
7. [Incremental migration strategy](#incremental-migration-strategy)
8. [FAQ](#faq)

---

## When to migrate

Consider Polystate when:

- You want to write state logic **once** and share it across React and Angular apps
- You are tired of Redux boilerplate (action types, action creators, selectors, reducers all in separate files)
- You want to **generate** native Redux/NgRx code from a single definition, instead of writing it by hand
- You need a small, zero-dependency core for micro-frontends or libraries

Do **not** migrate if:

- You rely heavily on Redux ecosystem middleware (redux-saga, redux-observable) — you can still use Polystate's runtime adapter alongside those libraries
- Your team has significant investment in existing DevTools/Redux architecture and the ROI of switching is unclear

---

## Prerequisites

```bash
# Runtime adapter
npm install @polystate/core @polystate/react   # React
npm install @polystate/core @polystate/angular # Angular

# Code generation (run once to produce standalone Redux/NgRx output)
npm install -g @polystate/cli
```

TypeScript 5+ with `strict: true` is required.

---

## From Redux Slice (React)

### Before — Redux Toolkit slice

```typescript
// store/todoSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Todo { id: number; title: string; done: boolean; }
interface TodoState { todos: Todo[]; filter: 'all' | 'active' | 'completed'; }

const initialState: TodoState = { todos: [], filter: 'all' };

export const todoSlice = createSlice({
  name: 'todo',
  initialState,
  reducers: {
    addTodo: (state, action: PayloadAction<string>) => {
      state.todos.push({ id: Date.now(), title: action.payload, done: false });
    },
    toggleTodo: (state, action: PayloadAction<number>) => {
      const todo = state.todos.find(t => t.id === action.payload);
      if (todo) todo.done = !todo.done;
    },
    removeTodo: (state, action: PayloadAction<number>) => {
      state.todos = state.todos.filter(t => t.id !== action.payload);
    },
    setFilter: (state, action: PayloadAction<'all' | 'active' | 'completed'>) => {
      state.filter = action.payload;
    },
  },
});

export const { addTodo, toggleTodo, removeTodo, setFilter } = todoSlice.actions;
export default todoSlice.reducer;
```

```typescript
// store/selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './store';

export const selectTodos = (state: RootState) => state.todo.todos;
export const selectFilter = (state: RootState) => state.todo.filter;

export const selectFilteredTodos = createSelector(
  selectTodos, selectFilter,
  (todos, filter) => {
    if (filter === 'active') return todos.filter(t => !t.done);
    if (filter === 'completed') return todos.filter(t => t.done);
    return todos;
  }
);
```

```tsx
// App.tsx
import { useSelector, useDispatch } from 'react-redux';
import { addTodo, toggleTodo, removeTodo, setFilter } from './store/todoSlice';
import { selectFilteredTodos, selectFilter } from './store/selectors';

function App() {
  const dispatch = useDispatch();
  const todos = useSelector(selectFilteredTodos);
  const filter = useSelector(selectFilter);

  return (/* ... */);
}
```

---

### After — Option A: Polystate runtime adapter

```typescript
// store/todoStore.ts
import { createStore } from '@polystate/core';
import { createStoreHooks } from '@polystate/react';

const todoStore = createStore(
  {
    todos: [] as Array<{ id: number; title: string; done: boolean }>,
    filter: 'all' as 'all' | 'active' | 'completed',
  },
  {
    addTodo: (state, title: string) => ({
      ...state,
      todos: [...state.todos, { id: Date.now(), title, done: false }],
    }),
    toggleTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.map(t => t.id === id ? { ...t, done: !t.done } : t),
    }),
    removeTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.filter(t => t.id !== id),
    }),
    setFilter: (state, filter: 'all' | 'active' | 'completed') => ({
      ...state,
      filter,
    }),
  }
);

export const { useStore, useSelector, useDispatch } = createStoreHooks(todoStore);
```

```tsx
// App.tsx
import { useStore, useSelector, useDispatch } from './store/todoStore';

function App() {
  const { dispatch } = useDispatch();
  const filter = useSelector(s => s.filter);
  const todos = useSelector(s =>
    filter === 'active'   ? s.todos.filter(t => !t.done) :
    filter === 'completed'? s.todos.filter(t => t.done)  : s.todos
  );

  return (/* ... */);
}
```

Key differences:
- No `configureStore`, `Provider`, or `useDispatch`/`useSelector` from react-redux
- Actions are plain functions — no action type strings
- Selectors are inline lambdas — no `createSelector` needed for this case
- Zero boilerplate files to maintain

---

### After — Option B: Code generation (keep native Redux)

Write a definition file, generate Redux code, then **never touch Polystate at runtime**:

```typescript
// store.definition.ts
import type { StoreDefinition } from '@polystate/definition';

export default {
  name: 'todo',
  initialState: {
    todos: [] as Array<{ id: number; title: string; done: boolean }>,
    filter: 'all' as 'all' | 'active' | 'completed',
  },
  actions: {
    addTodo: (state, title: string) => ({
      ...state,
      todos: [...state.todos, { id: Date.now(), title, done: false }],
    }),
    toggleTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.map(t => t.id === id ? { ...t, done: !t.done } : t),
    }),
    removeTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.filter(t => t.id !== id),
    }),
    setFilter: (state, filter: 'all' | 'active' | 'completed') => ({
      ...state,
      filter,
    }),
  },
} satisfies StoreDefinition;
```

```bash
polystate generate store.definition.ts --react --store-dir src/store
```

This produces `src/store/store.ts`, `src/store/hooks.ts`, `src/store/types.ts` — plain Redux Toolkit files with no Polystate runtime dependency. Your existing `useSelector`/`useDispatch` from react-redux continue to work.

---

## From NgRx (Angular)

### Before — NgRx boilerplate (4 files minimum)

```typescript
// store/todo.actions.ts
import { createAction, props } from '@ngrx/store';

export const addTodo    = createAction('[Todo] Add',    props<{ payload: string }>());
export const toggleTodo = createAction('[Todo] Toggle', props<{ payload: number }>());
export const removeTodo = createAction('[Todo] Remove', props<{ payload: number }>());
export const setFilter  = createAction('[Todo] Filter', props<{ payload: 'all' | 'active' | 'completed' }>());
```

```typescript
// store/todo.reducer.ts
import { createReducer, on } from '@ngrx/store';
import * as TodoActions from './todo.actions';

export interface TodoState {
  todos: Array<{ id: number; title: string; done: boolean }>;
  filter: 'all' | 'active' | 'completed';
}

const initialState: TodoState = { todos: [], filter: 'all' };

export const todoReducer = createReducer(
  initialState,
  on(TodoActions.addTodo, (state, { payload }) => ({
    ...state,
    todos: [...state.todos, { id: Date.now(), title: payload, done: false }],
  })),
  on(TodoActions.toggleTodo, (state, { payload: id }) => ({
    ...state,
    todos: state.todos.map(t => t.id === id ? { ...t, done: !t.done } : t),
  })),
  // ...
);
```

```typescript
// store/todo.selectors.ts
import { createSelector, createFeatureSelector } from '@ngrx/store';
import { TodoState } from './todo.reducer';

export const selectTodoState = createFeatureSelector<TodoState>('todo');
export const selectTodos  = createSelector(selectTodoState, s => s.todos);
export const selectFilter = createSelector(selectTodoState, s => s.filter);
export const selectFilteredTodos = createSelector(selectTodos, selectFilter, (todos, filter) => {
  if (filter === 'active') return todos.filter(t => !t.done);
  if (filter === 'completed') return todos.filter(t => t.done);
  return todos;
});
```

### After — Option A: Polystate Angular adapter

```typescript
// todo.service.ts
import { Injectable } from '@angular/core';
import { createAngularService } from '@polystate/angular';

const TodoService = createAngularService(
  {
    todos: [] as Array<{ id: number; title: string; done: boolean }>,
    filter: 'all' as 'all' | 'active' | 'completed',
  },
  {
    addTodo: (state, title: string) => ({
      ...state,
      todos: [...state.todos, { id: Date.now(), title, done: false }],
    }),
    toggleTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.map(t => t.id === id ? { ...t, done: !t.done } : t),
    }),
    removeTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.filter(t => t.id !== id),
    }),
    setFilter: (state, filter: 'all' | 'active' | 'completed') => ({
      ...state,
      filter,
    }),
  }
);

@Injectable({ providedIn: 'root' })
export class AppTodoService extends TodoService {}
```

```typescript
// app.component.ts
import { Component, inject } from '@angular/core';
import { AppTodoService } from './todo.service';

@Component({ /* ... */ })
export class AppComponent {
  private todo = inject(AppTodoService);

  todos    = this.todo.select(s => s.todos);   // Angular Signal
  filter   = this.todo.select(s => s.filter);
  todos$   = this.todo.select$(s => s.todos);  // RxJS Observable

  add(title: string)  { this.todo.dispatch('addTodo', title); }
  toggle(id: number)  { this.todo.dispatch('toggleTodo', id); }
  remove(id: number)  { this.todo.dispatch('removeTodo', id); }
}
```

### After — Option B: Code generation (keep native NgRx)

```bash
polystate generate store.definition.ts --angular --store-dir src/app/store
```

Generates: `actions.ts`, `reducer.ts`, `selectors.ts`, `state.ts`, `facade.ts`, `effects.ts` — all NgRx, no Polystate at runtime.

---

## From React Context + useReducer

### Before

```typescript
// TodoContext.tsx
import { createContext, useContext, useReducer, ReactNode } from 'react';

type Action =
  | { type: 'ADD_TODO'; payload: string }
  | { type: 'TOGGLE_TODO'; payload: number }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TODO':
      return { ...state, todos: [...state.todos, { id: Date.now(), title: action.payload, done: false }] };
    case 'TOGGLE_TODO':
      return { ...state, todos: state.todos.map(t => t.id === action.payload ? { ...t, done: !t.done } : t) };
    default:
      return state;
  }
}

const TodoContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

export function TodoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <TodoContext.Provider value={{ state, dispatch }}>{children}</TodoContext.Provider>;
}

export const useTodo = () => useContext(TodoContext)!;
```

### After — Polystate (no Provider, no switch)

```typescript
// todoStore.ts
import { createStore } from '@polystate/core';
import { createStoreContext } from '@polystate/react';

const todoStore = createStore(
  { todos: [] as Array<{ id: number; title: string; done: boolean }> },
  {
    addTodo: (state, title: string) => ({
      ...state,
      todos: [...state.todos, { id: Date.now(), title, done: false }],
    }),
    toggleTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.map(t => t.id === id ? { ...t, done: !t.done } : t),
    }),
  }
);

// Optional — use context if you need per-subtree isolation
export const { Provider, useContextStore } = createStoreContext(todoStore);

// Or just import the store directly — it's a singleton
export { todoStore };
```

No `Provider` wrapping is required unless you need multiple independent instances of the same store (e.g., in tests or nested subtrees).

---

## From Zustand or Jotai

### From Zustand

Polystate's runtime adapter is structurally similar to Zustand. The key difference is that Polystate actions are **pure functions** (return new state) while Zustand uses Immer mutation by default.

```typescript
// Zustand
const useStore = create<State>((set) => ({
  count: 0,
  increment: () => set(s => ({ count: s.count + 1 })),
}));
```

```typescript
// Polystate
const store = createStore(
  { count: 0 },
  { increment: (state) => ({ ...state, count: state.count + 1 }) }
);
const { useStore } = createStoreHooks(store);
```

The `useStore()` hook behaves the same as Zustand's — it re-renders when the selected slice changes.

### From Jotai

Jotai is atom-based; Polystate is store-based. If you use many small atoms, you might want to group related atoms into a single Polystate store and use `useSelector` to subscribe to the slice.

```typescript
// Jotai
const todosAtom = atom<Todo[]>([]);
const filterAtom = atom<Filter>('all');

// Polystate
const store = createStore(
  { todos: [] as Todo[], filter: 'all' as Filter },
  { /* actions */ }
);
// Subscribe only to todos — same granularity as individual atoms
const todos = useSelector(store, s => s.todos);
```

---

## Incremental migration strategy

Migrating a large app all at once is risky. Use this phased approach:

### Phase 1 — New features first

Use Polystate for any **new** feature stores. Keep existing Redux/NgRx stores unchanged. Polystate stores are independent modules; they do not require a global Redux store.

### Phase 2 — Migrate leaf stores

Migrate stores that have no dependants first (e.g., UI preference stores, modal state). Replace one Redux slice at a time. Run tests after each migration.

### Phase 3 — Migrate shared stores

Once you are comfortable with Polystate, migrate shared stores. If generating code: write the definition file, run `polystate generate`, then verify the output matches your existing reducer behavior.

### Phase 4 — Check for stale generated files

After committing your definition files, add a CI step:

```yaml
# .github/workflows/ci.yml
- name: Check generated files are up-to-date
  run: polystate check store.definition.ts --react --store-dir src/store
```

This exits 0 if all generated files are newer than the definition, 1 if stale, 2 if missing.

---

## FAQ

**Q: Do I need to remove Redux from my project to use Polystate?**

No. Polystate stores are entirely independent. You can run them alongside a Redux store. The React adapter does not use React-Redux's `Provider` or context.

**Q: Can I use Redux DevTools with Polystate?**

Yes. Install `@polystate/devtools` and add `devToolsMiddleware` to your store options. Time-travel debugging is supported.

**Q: What happens to my existing unit tests for reducers?**

Polystate action handlers are plain functions: `(state, payload) => newState`. They are trivially unit-testable without any store setup:

```typescript
import { todoActions } from './todoStore';

it('addTodo appends a todo', () => {
  const state = { todos: [], filter: 'all' as const };
  const next = todoActions.addTodo(state, 'Buy milk');
  expect(next.todos).toHaveLength(1);
  expect(next.todos[0].title).toBe('Buy milk');
});
```

**Q: Can I use middleware (logging, analytics, persistence) with Polystate?**

Yes. The middleware signature is:

```typescript
type Middleware<T> = (ctx: {
  action: string;
  payload: unknown;
  prevState: T;
  nextState: T;
  dispatch: (action: string, payload?: unknown) => void;
}) => void;
```

Runs **after** state is updated. See the built-in `loggerMiddleware` and `persistMiddleware` in `@polystate/core`.

**Q: Can I do async operations (data fetching)?**

In runtime mode, dispatch an async action:

```typescript
const store = createStore(
  { data: null, loading: false },
  {
    setLoading: (state, loading: boolean) => ({ ...state, loading }),
    setData: (state, data: unknown) => ({ ...state, data }),
  }
);

// Dispatch sequentially — store.dispatch is async-safe
async function fetchData() {
  await store.dispatch('setLoading', true);
  const data = await api.fetch();
  await store.dispatch('setData', data);
  await store.dispatch('setLoading', false);
}
```

In generated mode, add async actions to your definition and the generator will produce `createAsyncThunk` (React) or `@ngrx/effects` (Angular) for you.

**Q: Is Polystate suitable for large apps?**

The runtime adapter is suitable for any size. For very large apps with complex cross-store dependencies, the code-generation mode gives you the full power of Redux Toolkit or NgRx (DevTools, memoised selectors, effects, etc.) while removing the authoring burden.
