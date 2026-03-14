# @polystate/react

React 18+ hooks and context for Polystate state management.

## Features

- **React 18+ Optimized**: Built on `useSyncExternalStore` for perfect sync
- **Lightweight**: < 1kb gzipped
- **Zero Re-renders**: Selective subscriptions with memoization
- **TypeScript Support**: Full type safety with inference
- **Easy Integration**: Simple hooks API

## Installation

```bash
npm install @polystate/core @polystate/react
```

## Quick Start

```typescript
import React from 'react';
import { createStore } from '@polystate/core';
import { useStore, useSelector, useDispatch } from '@polystate/react';

// Create store (from @polystate/core)
const store = createStore(
  { count: 0 },
  {
    increment: (state) => ({ ...state, count: state.count + 1 }),
    decrement: (state) => ({ ...state, count: state.count - 1 }),
  }
);

// Use in component
function Counter() {
  const state = useStore(store); // Subscribe to all changes
  const { dispatch } = useDispatch(store);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch('increment')}>+</button>
      <button onClick={() => dispatch('decrement')}>-</button>
    </div>
  );
}
```

## Hooks

### useStore

Subscribe to the entire store state.

```typescript
function MyComponent() {
  const state = useStore(store);

  return <div>Count: {state.count}</div>;
}
```

**Re-renders when**: Any part of the state changes

### useSelector

Subscribe to a slice of state using a selector function.

```typescript
function TodoCount() {
  const todoCount = useSelector(
    store,
    (state) => state.todos.length
  );

  return <div>Todos: {todoCount}</div>;
}
```

**Re-renders when**: The selected value changes (uses `===` comparison)

### useDispatch

Dispatch actions to the store.

```typescript
function AddTodo() {
  const { dispatch } = useDispatch(store);

  const handleClick = () => {
    dispatch('addTodo', 'New todo');
  };

  return <button onClick={handleClick}>Add</button>;
}
```

### useSetState

Set state with partial updates (no action needed).

```typescript
function MyComponent() {
  const setState = useSetState(store);

  return (
    <button onClick={() => setState({ count: 42 })}>
      Set to 42
    </button>
  );
}
```

## Context Integration

For easier prop drilling, use context to provide the store.

### createStoreContext

```typescript
import { createStoreContext } from '@polystate/react';

// Create context for a store
const { Provider, useContextStore } = createStoreContext(store);

// Wrap your app
function App() {
  return (
    <Provider>
      <MyComponent />
    </Provider>
  );
}

// Access store in descendant components
function MyComponent() {
  const store = useContextStore();
  const state = useStore(store);

  return <div>{state.count}</div>;
}
```

## Factory Hooks

Pre-bind hooks to avoid passing store repeatedly.

### createStoreHooks

```typescript
import { createStoreHooks } from '@polystate/react';

// Create pre-bound hooks
const { useStore: useAppStore, useDispatch: useAppDispatch } =
  createStoreHooks(store);

// Use without passing store
function Counter() {
  const state = useAppStore();
  const { dispatch } = useAppDispatch();

  return (
    <div>
      <p>{state.count}</p>
      <button onClick={() => dispatch('increment')}>+</button>
    </div>
  );
}
```

## Complete Example

```typescript
import React, { useState } from 'react';
import { createStore } from '@polystate/core';
import {
  useStore,
  useSelector,
  useDispatch,
  createStoreHooks,
} from '@polystate/react';

// Define state type
interface TodoState {
  todos: Array<{ id: number; text: string; completed: boolean }>;
  filter: 'all' | 'completed' | 'active';
}

// Create store
const todoStore = createStore<TodoState>(
  { todos: [], filter: 'all' },
  {
    addTodo: (state, text: string) => ({
      ...state,
      todos: [...state.todos, { id: Date.now(), text, completed: false }],
    }),
    toggleTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    }),
    setFilter: (state, filter) => ({ ...state, filter }),
  }
);

// Create hooks
const { useDispatch: useTodoDispatch, useSelector: useTodoSelector } =
  createStoreHooks(todoStore);

// Add todo component
function AddTodo() {
  const [input, setInput] = useState('');
  const { dispatch } = useTodoDispatch();

  return (
    <>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        onClick={() => {
          dispatch('addTodo', input);
          setInput('');
        }}
      >
        Add
      </button>
    </>
  );
}

// Todo list component
function TodoList() {
  const todos = useTodoSelector((state) => state.todos);
  const filter = useTodoSelector((state) => state.filter);
  const { dispatch } = useTodoDispatch();

  const filtered = todos.filter((todo) => {
    if (filter === 'completed') return todo.completed;
    if (filter === 'active') return !todo.completed;
    return true;
  });

  return (
    <ul>
      {filtered.map((todo) => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => dispatch('toggleTodo', todo.id)}
          />
          {todo.text}
        </li>
      ))}
    </ul>
  );
}

// Filter buttons
function FilterButtons() {
  const filter = useTodoSelector((state) => state.filter);
  const { dispatch } = useTodoDispatch();

  return (
    <>
      {(['all', 'active', 'completed'] as const).map((f) => (
        <button
          key={f}
          onClick={() => dispatch('setFilter', f)}
          disabled={filter === f}
        >
          {f}
        </button>
      ))}
    </>
  );
}

// Main app
export function App() {
  return (
    <>
      <AddTodo />
      <FilterButtons />
      <TodoList />
    </>
  );
}
```

## Performance Optimization

### Selective Re-renders

Components only re-render when their selected state changes:

```typescript
// Only re-renders when state.count changes
function Counter() {
  const count = useSelector(store, (state) => state.count);
  return <div>{count}</div>;
}

// Only re-renders when state.name changes
function Name() {
  const name = useSelector(store, (state) => state.name);
  return <div>{name}</div>;
}

// Both can update independently
```

### Memoization

Dispatch callbacks are automatically memoized:

```typescript
const { dispatch } = useDispatch(store);

// This callback is stable across re-renders
const handleClick = () => dispatch('increment');
```

### Inline Selectors

Create selector functions outside components to avoid re-creating them:

```typescript
// ✅ Good: selector is stable
const selectCount = (state) => state.count;

function Counter() {
  const count = useSelector(store, selectCount);
}

// ❌ Avoid: new selector on every render
function CounterBad() {
  const count = useSelector(store, (state) => state.count);
}
```

## Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createStore } from '@polystate/core';
import { useStore, useDispatch } from '@polystate/react';

it('should update count on click', async () => {
  const store = createStore(
    { count: 0 },
    { increment: (state) => ({ ...state, count: state.count + 1 }) }
  );

  function Counter() {
    const state = useStore(store);
    const { dispatch } = useDispatch(store);

    return (
      <>
        <div>Count: {state.count}</div>
        <button onClick={() => dispatch('increment')}>Increment</button>
      </>
    );
  }

  render(<Counter />);

  expect(screen.getByText('Count: 0')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Increment'));

  await waitFor(() => {
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });
});
```

## API Reference

### useStore<T>

```typescript
function useStore<T>(store: Store<T>): T;
```

Subscribe to entire store state.

### useSelector<T, S>

```typescript
function useSelector<T, S>(store: Store<T>, selector: (state: T) => S): S;
```

Subscribe to selected slice of state.

### useDispatch<T>

```typescript
function useDispatch<T>(store: Store<T>): {
  dispatch: (action: string, payload?: unknown) => void | Promise<void>;
};
```

Get dispatch function.

### useSetState<T>

```typescript
function useSetState<T>(store: Store<T>): (patch: Partial<T>) => void;
```

Get setState function for partial updates.

### createStoreHooks<T>

```typescript
function createStoreHooks<T>(store: Store<T>): {
  useStore: () => T;
  useSelector: <S>(selector: (state: T) => S) => S;
  useDispatch: () => { dispatch: (...) => void };
  useSetState: () => (patch: Partial<T>) => void;
};
```

Create pre-bound hooks for a store.

### createStoreContext<T>

```typescript
function createStoreContext<T>(store: Store<T>): {
  Provider: React.FC<{ children: ReactNode }>;
  StoreContext: React.Context<Store<T>>;
  useContextStore: () => Store<T>;
};
```

Create context provider and hook.

## Comparison with Other Libraries

### vs Redux

- Simpler API (no reducers, dispatchers, types)
- Smaller bundle size
- Framework-agnostic core
- No boilerplate

### vs Zustand

- RxJS compatible
- Middleware system
- DevTools support
- More TypeScript friendly

### vs MobX

- Explicit actions
- Better TypeScript support
- No decorators needed
- Simpler reactivity model

## Best Practices

1. **Create store outside components**

   ```typescript
   // ✅ Good
   const store = createStore(initialState, actions);

   function App() {
     return <Counter />;
   }

   // ❌ Bad: recreates store on every render
   function AppBad() {
     const store = createStore(initialState, actions);
     return <Counter />;
   }
   ```

2. **Use selective subscriptions**

   ```typescript
   // ✅ Good: only subscribe to what you need
   const todos = useSelector(store, (state) => state.todos);

   // ❌ Avoid: subscribes to everything
   const state = useStore(store);
   const todos = state.todos;
   ```

3. **Keep selectors stable**

   ```typescript
   // ✅ Good
   const selectTodos = (state) => state.todos;
   const todos = useSelector(store, selectTodos);

   // ❌ Bad: recreates selector every render
   const todos = useSelector(store, (state) => state.todos);
   ```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

MIT
