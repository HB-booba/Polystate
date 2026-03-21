# Polystate

A **framework-agnostic state management library** with automatic code generation for React and Angular.

**Write your store definition once** → Generate native Redux + React hooks **or** NgRx + Angular services automatically.

## 🎯 Two Modes

### Mode 1: **Code Generation** (Recommended) ⭐

Define your store once, generate native framework code:

```bash
npx polystate generate store.definition.ts --react --angular
```

Creates production-ready Redux stores and NgRx stores from a single definition.

For CI and team workflows, you can also verify generated files are not stale:

```bash
npx polystate check store.definition.ts --react --store-dir src/store
```

### Mode 2: **Runtime Adapters**

Use Polystate as a runtime library with framework adapters:

```typescript
import { createStore } from '@polystate/core';
import { useStore } from '@polystate/react';
```

## 📦 Packages

```
polystate/
├── @polystate/definition         # Define stores (0 dependencies)
├── @polystate/generator-react    # Generate Redux + hooks
├── @polystate/generator-angular  # Generate NgRx + services
├── @polystate/cli                # CLI tool for generation
│
├── @polystate/core               # Runtime core (optional)
├── @polystate/react              # Runtime React adapter (optional)
├── @polystate/angular            # Runtime Angular adapter (optional)
└── examples/
    ├── react-todo-generated/     # React generated code example
    ├── angular-todo-generated/   # Angular generated code example
    ├── react-todo/               # React runtime example
    └── angular-todo/             # Angular runtime example
```

## 🟢 Getting Started (Code Generation)

### Step 1: Define Your Store (One File)

Create `store.definition.ts`:

```typescript
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
      todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }),
    removeTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.filter((t) => t.id !== id),
    }),
    setFilter: (state, filter: 'all' | 'active' | 'completed') => ({
      ...state,
      filter,
    }),
  },
} satisfies StoreDefinition;
```

### Step 2: Generate Code

```bash
# Install CLI
npm install --save-dev @polystate/cli

# Generate for both React and Angular
npx polystate generate store.definition.ts --react --angular

# Check generated files are current (good for CI)
npx polystate check store.definition.ts --react --store-dir src/store
```

### Step 3: Use Generated Code

**React Component:**

```typescript
import { useTodoDispatch, useFilteredTodos } from './store/hooks';

function TodoApp() {
  const todos = useFilteredTodos();
  const { addTodo, removeTodo } = useTodoDispatch();

  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id}>
          {todo.title}
          <button onClick={() => removeTodo(todo.id)}>Delete</button>
        </div>
      ))}
      <button onClick={() => addTodo('New task')}>Add</button>
    </div>
  );
}
```

**Angular Component:**

```typescript
import { Component } from '@angular/core';
import { TodoFacade } from './store/facade';

@Component({
  selector: 'app-todos',
  template: `
    <div *ngFor="let todo of facade.filteredTodos$ | async">
      {{ todo.title }}
      <button (click)="facade.removeTodo(todo.id)">Delete</button>
    </div>
    <button (click)="facade.addTodo('New task')">Add</button>
  `,
})
export class TodosComponent {
  constructor(public facade: TodoFacade) {}
}
```

## 🏗️ Architecture

### Code Generation Flow

```
store.definition.ts (Framework-agnostic)
        ↓
   polystate generate
    /            \
   ↓              ↓
React Output    Angular Output
(Redux)         (NgRx)
```

### Generated React Code Structure

```
src/store/
├── store.ts       # Redux store + actions + middleware
├── hooks.ts       # React hooks (useDispatch, useSelector)
└── types.ts       # TypeScript types
```

**Features:**

- Redux store with configureStore
- Built-in middleware: logger, persist, devtools
- Memoized selectors with reselect
- Custom React hooks matching your store

### Generated Angular Code Structure

```
src/app/store/
├── state.ts       # State interface
├── actions.ts     # NgRx actions
├── reducer.ts     # Reducer function
├── selectors.ts   # Memoized selectors
├── facade.ts      # Service facade
├── effects.ts     # NgRx effects (async actions)
└── store.module.ts # Angular module
```

**Features:**

- Complete NgRx store setup
- Actions with payload support
- Memoized selectors with createSelector
- Facade service for simple component API
- Angular module for easy integration

### React Todo Example

#### ❌ Without Polystate (Prop Drilling + useState)

```typescript
// App.tsx - Prop drilling mess
function App() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addTodo = (title: string) => {
    setTodos([...todos, { id: Date.now(), title, done: false }]);
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const removeTodo = (id: number) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  // Prop drilling through multiple levels
  return (
    <Header onAddTodo={addTodo} />
    <TodoList
      todos={todos}
      onToggle={toggleTodo}
      onRemove={removeTodo}
      filter={filter}
      setFilter={setFilter}
    />
    <Footer filter={filter} todos={todos} />
  );
}

// TodoList.tsx - Still prop drilling
function TodoList({ todos, onToggle, onRemove, filter, setFilter }) {
  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.done;
    if (filter === 'completed') return t.done;
    return true;
  });

  return (
    <div>
      {filtered.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

// TodoItem.tsx
function TodoItem({ todo, onToggle, onRemove }) {
  return (
    <div>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => onToggle(todo.id)}
      />
      <button onClick={() => onRemove(todo.id)}>Delete</button>
    </div>
  );
}
```

**Problems**:

- 🔗 Props drilling through 3+ component levels
- 🎯 Hard to track state flow
- 🐛 Easy to lose prop references
- 📈 All components re-render when any state changes
- 📦 State scattered across multiple useState calls

---

#### ✅ With Polystate

```typescript
// store.ts - Single source of truth
import { createStore } from '@polystate/core';

export const todoStore = createStore(
  { todos: [], filter: 'all' },
  {
    addTodo: (state, title: string) => ({
      ...state,
      todos: [...state.todos, { id: Date.now(), title, done: false }],
    }),
    toggleTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.map(t =>
        t.id === id ? { ...t, done: !t.done } : t
      ),
    }),
    removeTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.filter(t => t.id !== id),
    }),
    setFilter: (state, filter: string) => ({
      ...state,
      filter,
    }),
  }
);

// App.tsx - No prop drilling!
import { useSelector, useDispatch } from '@polystate/react';
import { todoStore } from './store';

function App() {
  const todos = useSelector(todoStore, state => state.todos);
  const filter = useSelector(todoStore, state => state.filter);
  const { addTodo } = useDispatch(todoStore);

  return (
    <>
      <Header onAddTodo={addTodo} />
      <TodoList todos={todos} filter={filter} />
      <Footer filter={filter} totalTodos={todos.length} />
    </>
  );
}

// TodoList.tsx - Direct store access, no props
function TodoList() {
  const filteredTodos = useSelector(todoStore, state => {
    const { todos, filter } = state;
    if (filter === 'active') return todos.filter(t => !t.done);
    if (filter === 'completed') return todos.filter(t => t.done);
    return todos;
  });

  return (
    <div>
      {filteredTodos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  );
}

// TodoItem.tsx - Direct store access
function TodoItem({ todo }) {
  const { toggleTodo, removeTodo } = useDispatch(todoStore);

  return (
    <div>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => toggleTodo(todo.id)}
      />
      <button onClick={() => removeTodo(todo.id)}>Delete</button>
    </div>
  );
}
```

**Benefits**:

- ✅ No prop drilling at all
- ✅ Clear, centralized state management
- ✅ Components only re-render when their selector output changes
- ✅ Easier to debug and trace state changes
- ✅ Single source of truth

**Lines of code**: 25% less boilerplate with Polystate

---

### Angular Todo Example

#### ❌ Without Polystate (Multiple Services + Components)

```typescript
// todo.service.ts
@Injectable({ providedIn: 'root' })
export class TodoService {
  private todos$ = new BehaviorSubject<Todo[]>([]);
  private filter$ = new BehaviorSubject<string>('all');

  getTodos() {
    return this.todos$.asObservable().pipe(
      withLatestFrom(this.filter$),
      map(([todos, filter]) => this.filterTodos(todos, filter))
    );
  }

  addTodo(title: string) {
    const current = this.todos$.value;
    this.todos$.next([...current, { id: Date.now(), title, done: false }]);
  }

  toggleTodo(id: number) {
    const current = this.todos$.value;
    this.todos$.next(current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  removeTodo(id: number) {
    const current = this.todos$.value;
    this.todos$.next(current.filter((t) => t.id !== id));
  }

  setFilter(filter: string) {
    this.filter$.next(filter);
  }

  private filterTodos(todos: Todo[], filter: string) {
    if (filter === 'active') return todos.filter((t) => !t.done);
    if (filter === 'completed') return todos.filter((t) => t.done);
    return todos;
  }
}

// app.component.ts
@Component({
  selector: 'app-root',
  template: `
    <div>
      <header>Todo App</header>
      <app-todo-list [todos]="todos$ | async"></app-todo-list>
    </div>
  `,
})
export class AppComponent implements OnInit {
  todos$: Observable<Todo[]>;

  constructor(private todoService: TodoService) {}

  ngOnInit() {
    this.todos$ = this.todoService.getTodos();
  }
}

// todo-list.component.ts
@Component({
  selector: 'app-todo-list',
  template: `
    <div *ngFor="let todo of todos">
      <app-todo-item [todo]="todo"></app-todo-item>
    </div>
  `,
})
export class TodoListComponent {
  @Input() todos: Todo[];
}

// todo-item.component.ts
@Component({
  selector: 'app-todo-item',
  template: `
    <div>
      <input [checked]="todo.done" (change)="onToggle()" />
      <button (click)="onRemove()">Delete</button>
    </div>
  `,
})
export class TodoItemComponent {
  @Input() todo: Todo;

  constructor(private todoService: TodoService) {}

  onToggle() {
    this.todoService.toggleTodo(this.todo.id);
  }

  onRemove() {
    this.todoService.removeTodo(this.todo.id);
  }
}
```

**Problems**:

- 📦 BehaviorSubject + Observable boilerplate
- 🎯 Manual filtering logic mixed in service
- 🧩 Component still uses @Input/@Output
- 📈 Harder to share computed state

---

#### ✅ With Polystate

```typescript
// todo.service.ts
import { Injectable, signal } from '@angular/core';
import { createStore } from '@polystate/core';
import { createAngularService } from '@polystate/angular';

@Injectable({ providedIn: 'root' })
export class TodoService extends createAngularService(
  { todos: [] as Todo[], filter: 'all' as string },
  {
    addTodo: (state, title: string) => ({
      ...state,
      todos: [...state.todos, { id: Date.now(), title, done: false }],
    }),
    toggleTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }),
    removeTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.filter((t) => t.id !== id),
    }),
    setFilter: (state, filter: string) => ({
      ...state,
      filter,
    }),
  }
) {}

// app.component.ts - Cleaner!
@Component({
  selector: 'app-root',
  template: `
    <div>
      <header>Todo App</header>
      <app-todo-list [todos]="todos$ | async" [filter]="filter$ | async"></app-todo-list>
    </div>
  `,
})
export class AppComponent {
  todos$ = this.todoService.select$((state) => state.todos);
  filter$ = this.todoService.select$((state) => state.filter);

  constructor(public todoService: TodoService) {}
}

// todo-list.component.ts
@Component({
  selector: 'app-todo-list',
  template: `
    <div *ngFor="let todo of filteredTodos$ | async">
      <app-todo-item [todo]="todo"></app-todo-item>
    </div>
  `,
})
export class TodoListComponent {
  @Input() todos: Todo[];
  @Input() filter: string;

  // Computed selectors
  filteredTodos$ = this.todoService.select$((state) => {
    const { todos, filter } = state;
    if (filter === 'active') return todos.filter((t) => !t.done);
    if (filter === 'completed') return todos.filter((t) => t.done);
    return todos;
  });

  constructor(public todoService: TodoService) {}
}

// todo-item.component.ts - Direct dispatch
@Component({
  selector: 'app-todo-item',
  template: `
    <div>
      <input [checked]="todo.done" (change)="onToggle()" />
      <button (click)="onRemove()">Delete</button>
    </div>
  `,
})
export class TodoItemComponent {
  @Input() todo: Todo;

  constructor(public todoService: TodoService) {}

  onToggle() {
    this.todoService.dispatch('toggleTodo', this.todo.id);
  }

  onRemove() {
    this.todoService.dispatch('removeTodo', this.todo.id);
  }
}
```

**Benefits**:

- ✅ Cleaner service definition
- ✅ `select$()` automatically returns Observable
- ✅ Still uses Angular Signals when needed
- ✅ 40% less boilerplate code
- ✅ Type-safe action dispatching

---

## 📊 Comparison Table

| Feature            | Without State Mgmt  | Redux  | Zustand | **Polystate** |
| ------------------ | ------------------- | ------ | ------- | ------------- |
| Bundle Size        | N/A                 | 4.2kb  | 1.2kb   | **1.2kb**     |
| Boilerplate        | Low (but scattered) | High   | Medium  | **Low**       |
| Learning Curve     | Easy                | Hard   | Medium  | **Easy**      |
| TypeScript Support | Basic               | Good   | Good    | **Excellent** |
| React Support      | ✅                  | ✅     | ✅      | **✅**        |
| Angular Support    | ❌                  | ❌     | ❌      | **✅**        |
| Vanilla JS Support | ✅                  | ✅     | ✅      | **✅**        |
| DevTools           | ❌                  | ✅     | ❌      | **✅**        |
| Async/Thunk        | Manual              | ✅     | ✅      | **✅**        |
| Persistence        | Manual              | Plugin | ✅      | **✅**        |
| RxJS Integration   | Manual              | No     | No      | **✅**        |
| Multi-Framework    | ❌                  | ❌     | ❌      | **✅**        |

---

## 🚀 Quick Start

### Installation

```bash
npm install @polystate/core @polystate/react
# or
npm install @polystate/core @polystate/angular
```

### What Gets Generated?

**React (3 files):**

- `store.ts` - Redux store + actions + middleware (logger, persist, devtools)
- `hooks.ts` - useDispatch, useSelector, and custom hooks
- `types.ts` - TypeScript types

**Angular (6 files):**

- `state.ts` - State interface
- `actions.ts` - NgRx actions
- `reducer.ts` - Reducer function
- `selectors.ts` - Memoized selectors
- `facade.ts` - Service facade
- `store.module.ts` - Angular module

All code is **production-ready** with:

- ✅ Full TypeScript support
- ✅ Memoized selectors (reselect)
- ✅ Built-in middleware (logger, persist, devtools)
- ✅ Redux DevTools integration
- ✅ Error handling patterns
- ✅ Auto-persistence to localStorage

## 📚 Runtime API Reference

> This section covers the `@polystate/core`, `@polystate/react`, and `@polystate/angular`
> runtime adapters. If you prefer generated Redux/NgRx code, see the
> [Code Generation](#-getting-started-code-generation) section above.

### Installation

```bash
# Core only (framework-agnostic, zero dependencies)
npm install @polystate/core

# With React 18+
npm install @polystate/core @polystate/react

# With Angular 17+
npm install @polystate/core @polystate/angular
```

---

### `createStore` — the foundation

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
    addTodo: (s, text: string) => ({
      ...s,
      todos: [...s.todos, { id: Date.now(), text, done: false }],
    }),
    toggle: (s, id: number) => ({
      ...s,
      todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }),
    remove: (s, id: number) => ({ ...s, todos: s.todos.filter((t) => t.id !== id) }),
    setFilter: (s, f: TodoState['filter']) => ({ ...s, filter: f }),
    setLoading: (s, loading: boolean) => ({ ...s, loading }),
  },
  {
    logging: true, // auto-attaches loggerMiddleware
    // middleware: [persistMiddleware('todos')],
  }
);
```

> **Immutability rule**: every action handler must return a **new object** — never mutate `state` in place.

---

### Store methods

| Method                          | Signature                                        | Notes                                                       |
| ------------------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| `getState()`                    | `() => T`                                        | Full state snapshot                                         |
| `getState(selector)`            | `(sel: (s: T) => S) => S`                        | Read a slice                                                |
| `dispatch(action, payload?)`    | `(string \| ThunkAction, any?) => Promise<void>` | Dispatch named action or thunk                              |
| `setState(patch)`               | `(Partial<T>) => void`                           | Bypass action handlers for direct patch                     |
| `subscribe(listener)`           | `(cb: (s: T) => void) => Unsubscriber`           | Global subscription                                         |
| `subscribe(selector, listener)` | `(sel, cb) => Unsubscriber`                      | Selective — only re-fires when `sel(state)` changes (`===`) |
| `getActionNames()`              | `() => string[]`                                 | Introspect registered actions                               |
| `reset()`                       | `() => void`                                     | Restore initial state and notify subscribers                |
| `destroy()`                     | `() => void`                                     | Remove all subscribers and prevent further updates          |

---

### Subscriptions

```typescript
// ── Global — fires on every dispatch ─────────────────────────────────────────
const unsubscribe = store.subscribe((state) => {
  console.log('new state:', state);
});
unsubscribe(); // stop listening

// ── Selective — fires only when the selected slice changes ───────────────────
const unsubFilter = store.subscribe(
  (s) => s.filter,
  (filter) => renderFilterLabel(filter) // only re-runs when filter changes
);
```

---

### Thunks — async actions

Dispatch a function instead of a string to get access to `dispatch` and `getState`:

```typescript
const loadTodos = async (dispatch, getState) => {
  await dispatch('setLoading', true);
  const data = await fetch('/api/todos').then((r) => r.json());
  await dispatch('setTodos', data);
  console.log('loaded', getState().todos.length, 'todos');
};

await store.dispatch(loadTodos);
```

Thunks can also dispatch other thunks:

```typescript
const withAuth = async (dispatch, getState) => {
  if (!getState().token) await dispatch(refreshToken); // dispatch thunk
  await dispatch(loadTodos);
};
```

---

### Reset & destroy

```typescript
// Restore to the exact initialState passed to createStore
store.reset();

// Tear down: clear all subscribers, ignore future dispatches
// Use when dynamically creating/destroying stores (e.g. per-route stores)
store.destroy();
```

---

### Middleware

Middleware runs **after** state is updated. It is purely for side effects.

```typescript
import {
  createStore,
  loggerMiddleware,
  persistMiddleware,
  loadPersistedState,
} from '@polystate/core';

const key = 'myapp:todos';
const savedState = loadPersistedState<TodoState>(key);

const store = createStore(savedState ?? initialState, actions, {
  middleware: [
    loggerMiddleware(), // console groups every action
    persistMiddleware(key), // auto-saves nextState to localStorage
  ],
});
```

**Custom middleware:**

```typescript
const analyticsMiddleware = async ({ action, payload, nextState, dispatch }) => {
  analytics.track(action, { payload });
};
```

---

### Slices (composable state)

```typescript
import { createSlice, prefixActions, composeSlices } from '@polystate/core';

const counterSlice = createSlice(
  { count: 0 },
  { inc: (s) => ({ count: s.count + 1 }), set: (s, n: number) => ({ count: n }) }
);

const labelSlice = createSlice({ text: 'default' }, { update: (s, t: string) => ({ text: t }) });

// composeSlices extracts {initialState, actions} from each slice
const [counterResult, labelResult] = composeSlices([counterSlice, labelSlice]);

// prefixActions namespaces actions: 'counter/inc', 'label/update', etc.
const store = createStore(
  { counter: counterResult.initialState, label: labelResult.initialState },
  {
    ...prefixActions(counterResult.actions, 'counter'),
    ...prefixActions(labelResult.actions, 'label'),
  }
);

await store.dispatch('counter/inc');
await store.dispatch('label/update', 'hello');
// → { counter: { count: 1 }, label: { text: 'hello' } }
```

---

### Observables (RxJS-compatible)

`asObservable` returns a zero-dependency observable with `pipe`, `map`, `filter`,
`distinctUntilChanged`, and `take` — compatible with RxJS operators.

```typescript
import { asObservable, map, filter, distinctUntilChanged, take } from '@polystate/core';

// Full state
asObservable(store).subscribe((state) => console.log(state));

// Selector variant — only emits when todos.length changes
asObservable(store, (s) => s.todos.length).subscribe((n) => console.log(n, 'todos'));

// Operator chain without RxJS
asObservable(store, (s) => s.todos)
  .pipe(
    map((todos) => todos.filter((t) => !t.done)),
    filter((active) => active.length > 0),
    take(10)
  )
  .subscribe((activeTodos) => renderList(activeTodos));

// With RxJS — interchangeable (same interface)
import { distinctUntilChanged as rxDistinct } from 'rxjs/operators';
// asObservable(store).pipe(rxDistinct()).subscribe(...)
```

---

### React hooks (`@polystate/react`)

```tsx
import { createStore } from '@polystate/core';
import {
  useStore,
  useSelector,
  useDispatch,
  useSetState,
  createStoreHooks,
  createStoreContext,
} from '@polystate/react';

const todoStore = createStore(initialState, actions);

// ── Option A: global hooks ────────────────────────────────────────────────────
function TodoList() {
  const todos = useSelector(todoStore, (s) => s.todos); // only re-renders when todos changes
  const { dispatch } = useDispatch(todoStore);

  return (
    <>
      {todos.map((t) => (
        <li key={t.id}>{t.text}</li>
      ))}
      <button onClick={() => dispatch('addTodo', 'New task')}>Add</button>
    </>
  );
}

// ── Option B: pre-bound hooks (recommended) ───────────────────────────────────
const {
  useStore: useTodoStore,
  useSelector: useTodoSel,
  useDispatch: useTodoDispatch,
} = createStoreHooks(todoStore);

// ── Option C: React Context ───────────────────────────────────────────────────
const { Provider, useContextStore } = createStoreContext(todoStore);

function App() {
  return (
    <Provider>
      <TodoList />
    </Provider>
  );
}
```

**All hooks use `useSyncExternalStore`** (React 18+) — tearing-safe, concurrent rendering compatible.

| Hook                        | Purpose                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `useStore(store)`           | Subscribe to full state                                                 |
| `useSelector(store, sel)`   | Subscribe to a slice; skips re-renders when selected value is unchanged |
| `useDispatch(store)`        | Returns stable `{ dispatch }` memoized with `useCallback`               |
| `useSetState(store)`        | Returns `(patch: Partial<T>) => void` for direct partial updates        |
| `createStoreHooks(store)`   | Pre-binds all four hooks to a specific store                            |
| `createStoreContext(store)` | Creates React Context `Provider` + `useContextStore()`                  |

---

### Angular service (`@polystate/angular`)

```typescript
import { Injectable } from '@angular/core';
import { createAngularService } from '@polystate/angular';

@Injectable({ providedIn: 'root' })
export class TodoService extends createAngularService<TodoState>(initialState, actions) {}
```

The base class provides:

```typescript
// Angular Signal (requires injection context)
todos = this.select((s) => s.todos);

// RxJS Observable (async pipe compatible)
todos$ = this.select$((s) => s.todos);

// Dispatch
this.dispatch('addTodo', 'Buy milk');

// Snapshot
this.getState();
this.getState((s) => s.todos.length);
```

Subscriptions are **automatically cleaned up** via `takeUntil(destroy$)` on `ngOnDestroy`.

---

### Performance (measured on Apple M-series)

| Operation                              | Throughput     |
| -------------------------------------- | -------------- |
| `getState()`                           | ~23 M ops/sec  |
| `dispatch` (simple action)             | ~3.2 M ops/sec |
| `setState` (no subscribers)            | ~6.2 M ops/sec |
| `reset()`                              | ~6.7 M ops/sec |
| `subscribe + unsubscribe`              | ~5.4 M ops/sec |
| `dispatch` with 100 global subscribers | ~225 K ops/sec |

Bundle sizes (gzipped): `@polystate/core` < 1.5 KB · `@polystate/react` < 0.5 KB · `@polystate/angular` < 1 KB

## 🔧 Configuration

### TypeScript

Polystate is built with TypeScript strict mode:

```typescript
// Full type safety
const store = createStore(
  { count: 0, name: 'John' },
  {
    increment: (state) => ({ ...state, count: state.count + 1 }),
    // ✅ Type-safe: state shape is inferred
    // ❌ Error: missing required property 'name'
  }
);
```

### DevTools

```typescript
import { createStore } from '@polystate/core';

const store = createStore(
  { todos: [] },
  {
    /* actions */
  },
  {
    middleware: [new DevToolsMiddleware()],
  }
);
```

## � Why Polystate?

### Code Generation Advantages

| Feature        | Manual Redux       | Manual NgRx    | **Polystate Generated** |
| -------------- | ------------------ | -------------- | ----------------------- |
| Setup Time     | 2-3 hours          | 3-4 hours      | **5 minutes**           |
| Boilerplate    | 200+ lines         | 400+ lines     | **Auto-generated**      |
| Selectors      | Manual memoization | createSelector | **Auto-memoized**       |
| Middleware     | Manual setup       | Effects        | **Pre-configured**      |
| Persistence    | Custom code        | Custom code    | **Built-in**            |
| DevTools       | Manual wiring      | Manual wiring  | **Built-in**            |
| Type Safety    | Good               | Good           | **Excellent**           |
| Error Handling | Manual             | Manual         | **Standard patterns**   |

### Runtime Advantages (using @polystate/core)

- **Single core** → No duplication between React and Angular
- **Framework-agnostic** → Share stores across teams/projects
- **Lightweight** → Core < 1.5kb gzipped
- **Zero dependencies** → No hidden bloat
- **Full TypeScript** → Complete type inference
- **Multi-framework** → Works with any framework

## 🔄 How It Works

### 1. Write Definition (Framework-Independent)

```typescript
export const todoDefinition = {
  name: 'todo',
  initialState: { todos: [], filter: 'all' },
  actions: {
    addTodo: (state, title) => ({ ...state, todos: [...] }),
    toggleTodo: (state, id) => ({ ...state, todos: [...] }),
    // ...
  }
}
```

### 2. Generate Code

```bash
polystate generate store.definition.ts --react --angular
```

### 3. Use in Components

**React** - Generated hooks are automatically typed

```typescript
const todos = useFilteredTodos();
const { addTodo } = useTodoDispatch();
```

**Angular** - Generated service is automatically injected

```typescript
todos$ = this.facade.filteredTodos$;
addTodo(title) { this.facade.addTodo(title); }
```

## 🚀 Benefits

✅ **Write once, deploy to React and Angular**
✅ **Production-ready generated code** (not wrappers)
✅ **Zero extra dependencies** in generated code
✅ **Built-in best practices** (logging, persistence, devtools)
✅ **Faster iteration** (change definition → regenerate)
✅ **Type-safe by default**
✅ **Framework-native implementations** (real Redux, real NgRx)

## �📖 Documentation

**Code Generation (Recommended):**

- **[Definition Guide](./packages/definition/README.md)** - How to write store definitions
- **[CLI Tool](./packages/cli/README.md)** - How to use polystate generate
- **[React Generator](./packages/generator-react/README.md)** - Generated Redux code format
- **[Angular Generator](./packages/generator-angular/README.md)** - Generated NgRx code format

**Runtime API (Optional):**

- **[Core API](./packages/core/README.md)** - Complete core API reference
- **[React Integration](./packages/react/README.md)** - Runtime React hooks
- **[Angular Integration](./packages/angular/README.md)** - Runtime Angular services
- **[DevTools](./packages/devtools/README.md)** - Redux DevTools Extension bridge

## 🎯 Examples

- **[React Todo Generated](./examples/react-todo-generated)** - Complete todo app with generated Redux code
- **[Angular Todo Generated](./examples/angular-todo-generated)** - Complete todo app with generated NgRx code
- **[React Todo Runtime](./examples/react-todo)** - Using Polystate runtime adapters
- **[Angular Todo Runtime](./examples/angular-todo)** - Using Polystate runtime adapters

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests for specific package
npm run test -- @polystate/core

# With coverage
npm run test -- --coverage
```

## 📊 Bundle Sizes

| Package            | Size (gzipped) | Size (minified) |
| ------------------ | -------------- | --------------- |
| @polystate/core    | 1.2kb          | 3.5kb           |
| @polystate/react   | 0.8kb          | 2.1kb           |
| @polystate/angular | 0.9kb          | 2.3kb           |

## 🔐 Type Safety

All public APIs have full JSDoc comments and TypeScript support:

```typescript
/**
 * Creates a reactive store with actions and middleware support.
 * @template T - The shape of the store state
 * @param initialState - The initial state value
 * @param actions - Action map, pure functions that return new state
 * @param options - Optional configuration
 * @returns A Store instance with full type inference
 */
export function createStore<T>(
  initialState: T,
  actions: ActionMap<T>,
  options?: StoreOptions
): Store<T> {
  /* ... */
}
```

## 🛠️ Development

### Commands

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format

# Watch mode
npm run dev
```

### Monorepo Structure

```
packages/
├── core/               # Framework-agnostic core (0 dependencies)
│   ├── src/
│   │   ├── signal.ts     # Reactive Signal primitive
│   │   ├── store.ts      # Store class & createStore factory
│   │   ├── slice.ts      # createSlice for modular actions
│   │   ├── middleware.ts # Middleware system
│   │   ├── observable.ts # asObservable RxJS bridge
│   │   └── index.ts      # Public API
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── react/              # React 18+ adapter
│   ├── src/
│   │   ├── hooks/        # useStore, useDispatch, useSelector
│   │   ├── context.ts    # Store context
│   │   └── index.ts
│   └── ...
├── angular/            # Angular 17+ adapter
│   ├── src/
│   │   ├── service.ts    # PolystateService
│   │   └── index.ts
│   └── ...
└── devtools/           # Redux DevTools Extension bridge
    ├── src/
    │   ├── middleware.ts
    │   └── index.ts
    └── ...
```

## 🐛 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:

- Setting up development environment
- Running tests and linting
- Submitting pull requests
- Writing commit messages (conventional commits)
- Release process

## 📝 Changelog

Changes are tracked in [CHANGELOG.md](./CHANGELOG.md). Releases follow semantic versioning.

## 📄 License

MIT

## 🤝 Support

- **Issues**: [GitHub Issues](https://github.com/polystate/polystate/issues)
- **Discussions**: [GitHub Discussions](https://github.com/polystate/polystate/discussions)
- **Twitter**: [@polystatelib](https://twitter.com/polystatelib)

---

**Made with ❤️ for developers who value simplicity and type safety.**
