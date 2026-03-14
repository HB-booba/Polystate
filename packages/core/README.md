# @polystate/core

Framework-agnostic state management core with **zero dependencies**.

## Features

- **Lightweight**: < 1.5kb gzipped
- **Framework Agnostic**: Works with React, Angular, Vue, or vanilla JS
- **Full TypeScript Support**: Strict mode, complete type safety
- **Reactive Primitives**: Signal-based reactivity system
- **Middleware System**: Logger, thunk, persist, devtools, and custom middleware
- **RxJS Compatible**: `asObservable()` bridge for seamless RxJS integration
- **Selective Subscriptions**: Only re-render what changed

## Installation

```bash
npm install @polystate/core
```

## Quick Start

### Basic Store

```typescript
import { createStore } from '@polystate/core';

// 1. Define your state type
interface CounterState {
  count: number;
}

// 2. Create a store with initial state and actions
const store = createStore<CounterState>(
  { count: 0 }, // initial state
  {
    // actions (reducers)
    increment: (state) => ({ ...state, count: state.count + 1 }),
    decrement: (state) => ({ ...state, count: state.count - 1 }),
    incrementByAmount: (state, amount: number) => ({
      ...state,
      count: state.count + amount,
    }),
  }
);

// 3. Use the store
console.log(store.getState()); // { count: 0 }

await store.dispatch('increment');
console.log(store.getState()); // { count: 1 }

await store.dispatch('incrementByAmount', 5);
console.log(store.getState()); // { count: 6 }
```

### Subscriptions

```typescript
// Subscribe to all changes
const unsubscribe = store.subscribe((state) => {
  console.log('State changed:', state);
});

// Subscribe to specific slices
const unsubscribeTodos = store.subscribe(
  (state) => state.todos, // selector
  (todos) => {
    // only called when todos change
    console.log('Todos updated:', todos);
  }
);

// Unsubscribe
unsubscribe();
unsubscribeTodos();
```

## Core Concepts

### Signal

Reactive primitive that notifies subscribers of changes.

```typescript
import { Signal } from '@polystate/core';

const signal = new Signal(0);

signal.subscribe((value) => {
  console.log('Value:', value);
});

signal.value = 42; // Logs: "Value: 42"
```

### Store

The main store class for state management.

```typescript
import { Store, createStore } from '@polystate/core';

const store = createStore(initialState, actions, {
  middleware: [loggerMiddleware()],
});
```

### Actions

Pure functions that return new state.

```typescript
const actions = {
  // Simple action
  increment: (state) => ({ ...state, count: state.count + 1 }),

  // Action with payload
  setName: (state, name: string) => ({ ...state, name }),

  // Action with complex payload
  updateUser: (state, user: { id: number; name: string }) => ({
    ...state,
    user,
  }),
};
```

### Slices

Redux Toolkit-style modular actions.

```typescript
import { createSlice, prefixActions } from '@polystate/core';

// Create a slice
const counterSlice = createSlice(
  { count: 0 }, // initial state
  {
    // actions
    increment: (state) => ({ ...state, count: state.count + 1 }),
    decrement: (state) => ({ ...state, count: state.count - 1 }),
  }
);

// Use in store with prefixing
const store = createStore(
  { counter: counterSlice.initialState, todos: [] },
  {
    ...prefixActions(counterSlice.actions, 'counter'),
    addTodo: (state, title) => ({
      ...state,
      todos: [...state.todos, title],
    }),
  }
);

// Dispatch prefixed actions
await store.dispatch('counter/increment');
```

### Middleware

Intercept actions and state changes.

```typescript
import { loggerMiddleware, persistMiddleware, devToolsMiddleware } from '@polystate/core';

const store = createStore(initialState, actions, {
  middleware: [
    loggerMiddleware(), // logs all actions
    persistMiddleware('app-state'), // persists to localStorage
    devToolsMiddleware('MyStore'), // Redux DevTools integration
  ],
});
```

#### Built-in Middleware

**Logger**

```typescript
import { loggerMiddleware } from '@polystate/core';

const store = createStore(state, actions, {
  middleware: [loggerMiddleware()],
});

// Output:
// [incrementCounter]
// Payload: undefined
// Prev State: { count: 0 }
// Next State: { count: 1 }
```

**Thunk**

Enable async actions.

```typescript
const store = createStore(state, actions);

// Async thunk action
const fetchUser = async (dispatch, getState) => {
  const state = getState(); // current state
  const response = await fetch('/api/user');
  const user = await response.json();
  dispatch('setUser', user);
};

// Dispatch the thunk
await store.dispatch(fetchUser);
```

**Persist**

Auto-save state to storage.

```typescript
import { persistMiddleware, loadPersistedState } from '@polystate/core';

// Load persisted state
const savedState = loadPersistedState('my-app') ?? initialState;

const store = createStore(savedState, actions, {
  middleware: [persistMiddleware('my-app')],
});

// State is now persisted to localStorage after every action
```

**DevTools**

Redux DevTools Extension integration.

```typescript
import { devToolsMiddleware } from '@polystate/core';

const store = createStore(state, actions, {
  middleware: [devToolsMiddleware('MyStore')],
});

// Open Redux DevTools to inspect actions and time-travel
```

#### Custom Middleware

```typescript
import type { Middleware } from '@polystate/core';

const customMiddleware: Middleware = (context) => {
  console.log(`Action: ${context.action}`);
  console.log(`Prev state:`, context.prevState);
  console.log(`Next state:`, context.nextState);
  console.log(`Payload:`, context.payload);

  // Dispatch another action if needed
  if (context.action === 'someAction') {
    context.dispatch('anotherAction', { data: 'value' });
  }
};

const store = createStore(state, actions, {
  middleware: [customMiddleware],
});
```

### setState

Partial state updates without actions.

```typescript
store.setState({ count: 42 });
store.setState({ name: 'Alice' });

// Also works with setters in React
const [state, setState] = useState(store.getState());
store.setState(patch);
```

## RxJS Integration

Convert store to RxJS Observable.

```typescript
import {
  asObservable,
  map,
  filter,
  distinctUntilChanged,
  take,
} from '@polystate/core';

const store = createStore({ count: 0, name: 'Test' }, {...});

// Convert to observable
const state$ = asObservable(store);

// With operators
const count$ = asObservable(store, (state) => state.count)
  .pipe(
    filter((count) => count > 0),
    distinctUntilChanged(),
    map((count) => count * 2)
  );

count$.subscribe((doubled) => {
  console.log('Doubled count:', doubled);
});

// With RxJS operators (via pipe)
import { debounceTime, skipWhile } from 'rxjs/operators';

// Note: Polystate includes: map, filter, distinctUntilChanged, take
```

## API Reference

### Store<T>

The main store class.

```typescript
class Store<T> {
  // Get state or selected value
  getState(): T;
  getState<S>(selector: Selector<T, S>): S;

  // Set state with partial update
  setState(patch: Partial<T> | T): void;

  // Dispatch action
  dispatch(action: string | ThunkAction<T>, payload?: unknown): Promise<void>;

  // Subscribe to changes
  subscribe(listener: Subscriber<T>): Unsubscriber;
  subscribe<S>(selector: Selector<T, S>, listener: Subscriber<S>): Unsubscriber;
}
```

### createStore<T>

Factory function to create a store.

```typescript
function createStore<T>(
  initialState: T,
  actions: ActionMap<T>,
  options?: StoreOptions<T>
): Store<T>;
```

### createSlice<T>

Factory function to create a slice.

```typescript
function createSlice<T>(
  initialState: T,
  reducers: Record<string, ActionHandler<T>>,
  options?: SliceOptions<T>
): Slice<T>;
```

### asObservable<T>

Convert store to RxJS-compatible observable.

```typescript
function asObservable<T>(store: Store<T>): Observable<T>;
function asObservable<T, S>(store: Store<T>, selector: Selector<T, S>): Observable<S>;
```

## Type Safety

Full TypeScript strict mode support.

```typescript
interface MyState {
  count: number;
  name: string;
}

const store = createStore<MyState>(
  { count: 0, name: 'Alice' },
  {
    // ✅ Type-safe: return type must match MyState
    increment: (state) => ({ ...state, count: state.count + 1 }),

    // ✅ Payload type is inferred
    setName: (state, name: string) => ({ ...state, name }),

    // ❌ Error: missing 'name' property
    // incrementWrong: (state) => ({ count: state.count + 1 }),
  }
);

// ✅ Type-safe dispatch
await store.dispatch('increment');
await store.dispatch('setName', 'Bob');

// ❌ Error: 'notAnAction' is not a valid action
// await store.dispatch('notAnAction');

// ✅ Type-safe selectors
const count = store.getState((state) => state.count); // number

// ❌ Error: cannot assign string to number
// const count: number = store.getState((state) => state.name);
```

## Best Practices

### 1. Immutable Updates

Always return new state objects.

```typescript
// ✅ Good
increment: (state) => ({ ...state, count: state.count + 1 }),

// ❌ Bad: mutates original state
incrementBad: (state) => {
  state.count++;
  return state;
},
```

### 2. Normalized State

Keep state flat for easier updates.

```typescript
// ✅ Good
{
  users: {
    1: { id: 1, name: 'Alice' },
    2: { id: 2, name: 'Bob' },
  }
}

// ❌ Avoid deeply nested structures
{
  users: [
    { ...complex nested data... }
  ]
}
```

### 3. Selective Subscriptions

Subscribe to specific slices to optimize re-renders.

```typescript
// ✅ Good: only subscribe to what you need
store.subscribe(
  (state) => state.todos,
  (todos) => updateUI(todos)
);

// ❌ Avoid: subscribing to entire state
store.subscribe((state) => updateUI(state.todos));
```

### 4. Use Slices for Organization

Organize related state and actions.

```typescript
const userSlice = createSlice(
  { name: '', email: '' },
  {
    setName: (state, name) => ({ ...state, name }),
    setEmail: (state, email) => ({ ...state, email }),
  }
);

const todoSlice = createSlice(
  { todos: [] },
  {
    addTodo: (state, title) => ({ ...state, todos: [...state.todos, title] }),
  }
);
```

## Bundle Size

The core package is extremely lightweight:

- **Minified**: ~3.5kb
- **Gzipped**: ~1.2kb
- **No dependencies**: Pure TypeScript

Optimized for:

- Tree-shaking: Only import what you use
- Dead-code elimination
- Minimal runtime overhead

## Examples

See the [examples](../../examples/) directory for:

- [React Todo App](../../examples/react-todo)
- [Angular Todo App](../../examples/angular-todo)
- [Next.js SSR](../../examples/nextjs-ssr)
- [Angular Universal](../../examples/angular-universal)
- [Micro-Frontends](../../examples/micro-frontends)

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

MIT
