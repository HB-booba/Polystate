# @polystate/devtools

Redux DevTools Extension middleware for Polystate with time-travel debugging.

## Features

- **Redux DevTools Integration**: Full support for Redux DevTools Extension
- **Time-Travel Debugging**: Step through action history
- **Action Inspector**: View and inspect all actions and state changes
- **State Snapshots**: Export and import state for debugging
- **Action History**: Track action sequence and payloads
- **Zero Runtime Cost**: Only active when DevTools Extension is installed

## Installation

```bash
npm install @polystate/core @polystate/devtools
```

You also need the [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools-extension) browser extension.

## Quick Start

```typescript
import { createStore } from '@polystate/core';
import { createDevToolsMiddleware } from '@polystate/devtools';

// Create store first (needed so DevTools can call store.setState for time-travel)
const store = createStore(
  { count: 0 },
  {
    increment: (state) => ({ ...state, count: state.count + 1 }),
  },
  {
    middleware: [
      createDevToolsMiddleware(store, {
        name: 'CounterStore',
        timeTravel: true,
        maxAge: 50,
      }),
    ],
  }
);

// Now open Redux DevTools to inspect and time-travel!
```

## Configuration

### Basic Setup

```typescript
import { createDevToolsMiddleware } from '@polystate/devtools';

const store = createStore(initialState, actions, {
  middleware: [createDevToolsMiddleware()],
});
```

### With Options

```typescript
const store = createStore(initialState, actions, {
  middleware: [
    createDevToolsMiddleware({
      // Store name shown in DevTools
      name: 'MyAppStore',

      // Enable time-travel debugging
      timeTravel: true,

      // Maximum actions to keep in history
      maxAge: 50,
    }),
  ],
});
```

## Features

### Action Inspection

View all dispatched actions and their payloads:

```typescript
await store.dispatch('addTodo', { text: 'Learn Polystate' });
// Shows in DevTools:
// {
//   type: 'addTodo',
//   payload: { text: 'Learn Polystate' },
//   timestamp: 1699564032450
// }
```

### State Snapshots

Export and import state for debugging:

```typescript
// Export current state in DevTools
// (Use DevTools UI: Store → Export)

// Import saved state
// (Use DevTools UI: Store → Import State)
```

### Time-Travel Debugging

Step forward and backward through action history:

1. Open Redux DevTools
2. Click on any action in the history
3. App state jumps to that point
4. Make changes and step forward again

### Store Name Configuration

```typescript
createDevToolsMiddleware({
  name: 'UserStore', // Shown in DevTools dropdown
});
```

## Multi-Store Setup

Use different names for different stores:

```typescript
const userStore = createStore(userState, userActions, {
  middleware: [createDevToolsMiddleware({ name: 'UserStore' })],
});

const todoStore = createStore(todoState, todoActions, {
  middleware: [createDevToolsMiddleware({ name: 'TodoStore' })],
});

const appStore = createStore(appState, appActions, {
  middleware: [createDevToolsMiddleware({ name: 'AppStore' })],
});
```

Switch between stores in DevTools dropdown.

## Combining with Other Middleware

```typescript
import { loggerMiddleware, persistMiddleware } from '@polystate/core';
import { createDevToolsMiddleware } from '@polystate/devtools';

const store = createStore(initialState, actions, {
  middleware: [
    // Logger first (logs complete context)
    loggerMiddleware(),

    // DevTools for inspection
    createDevToolsMiddleware({ name: 'MyStore' }),

    // Persist last (fires after other middleware)
    persistMiddleware('my-app'),
  ],
});
```

## TypeScript Example

```typescript
import { createStore } from '@polystate/core';
import { createDevToolsMiddleware } from '@polystate/devtools';

interface AppState {
  count: number;
  user: { id: number; name: string } | null;
  loading: boolean;
}

const store = createStore<AppState>(
  { count: 0, user: null, loading: false },
  {
    increment: (state) => ({
      ...state,
      count: state.count + 1,
    }),
    setUser: (state, user: AppState['user']) => ({
      ...state,
      user,
    }),
    setLoading: (state, loading: boolean) => ({
      ...state,
      loading,
    }),
  },
  {
    middleware: [
      createDevToolsMiddleware({
        name: 'AppStore',
        timeTravel: true,
        maxAge: 30,
      }),
    ],
  }
);

// Dispatch with full type safety
await store.dispatch('increment');
await store.dispatch('setUser', { id: 1, name: 'Alice' });
await store.dispatch('setLoading', false);
```

## React Integration

```typescript
import { createStore } from '@polystate/core';
import { useSelector, useDispatch } from '@polystate/react';
import { createDevToolsMiddleware } from '@polystate/devtools';

const store = createStore(initialState, actions, {
  middleware: [createDevToolsMiddleware({ name: 'ReactStore' })],
});

function App() {
  const count = useSelector(store, (state) => state.count);
  const { dispatch } = useDispatch(store);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => dispatch('increment')}>+</button>
    </div>
  );
}
```

## Angular Integration

```typescript
import { Injectable } from '@angular/core';
import { createStore } from '@polystate/core';
import { PolystateService } from '@polystate/angular';
import { createDevToolsMiddleware } from '@polystate/devtools';

@Injectable({ providedIn: 'root' })
export class CounterService extends PolystateService<{ count: number }> {
  private store = createStore(
    { count: 0 },
    { increment: (state) => ({ ...state, count: state.count + 1 }) },
    {
      middleware: [createDevToolsMiddleware({ name: 'AngularStore' })],
    }
  );

  count = this.select((state) => state.count);
}
```

## DevTools Shortcuts

After installing the Redux DevTools Extension:

- **Open DevTools**: Usually F12 or Cmd+Option+I
- **Find Store**: Look for the Redux tab in DevTools
- **Inspect Action**: Click any action to see full details
- **Time Travel**: Click any action to jump to that state
- **Dispatch Action**: Use the Actions tab to dispatch manually
- **Export State**: Use Store → Export State
- **Import State**: Use Store → Import State

## Browser Support

Works in any browser with Redux DevTools Extension installed:

- Chrome
- Firefox
- Edge
- Safari (with extension)

## Performance

The middleware has minimal performance impact:

- No overhead if DevTools Extension is not installed
- Efficient action recording
- Configurable history size (default: 50 actions)
- Zero-copy state snapshots

## Options Reference

```typescript
interface DevToolsConfig {
  /**
   * Store name for DevTools UI
   * @default "Polystate Store"
   */
  name?: string;

  /**
   * Enable time-travel debugging
   * @default true
   */
  timeTravel?: boolean;

  /**
   * Maximum number of actions to keep in history
   * @default 50
   */
  maxAge?: number;
}
```

## Troubleshooting

### DevTools not showing actions

1. Install Redux DevTools Extension
2. Open DevTools (F12)
3. Click "Redux" tab (might be under ">>" icons)
4. Make sure Polystate store is selected in dropdown

### Actions not time-traveling

Check that `timeTravel: true` is set in config:

```typescript
createDevToolsMiddleware({
  name: 'MyStore',
  timeTravel: true, // ← Add this
});
```

### Too many actions in history

Reduce `maxAge`:

```typescript
createDevToolsMiddleware({
  name: 'MyStore',
  maxAge: 20, // Keep only last 20 actions
});
```

## API Reference

### createDevToolsMiddleware

```typescript
function createDevToolsMiddleware<T>(config?: DevToolsConfig): Middleware<T>;
```

Creates DevTools middleware for a store.

**Parameters:**

- `config` - Optional configuration object

**Returns:** Middleware function

**Example:**

```typescript
const middleware = createDevToolsMiddleware({ name: 'AppStore' });
```

### connectDevTools

```typescript
function connectDevTools<T>(store: Store<T>, config?: DevToolsConfig): Store<T>;
```

Connect an existing store to DevTools (if not already connected).

### exportStateHistory

```typescript
function exportStateHistory(store: Store<any>): Array<{ action: string; state: any }>;
```

Export the action/state history.

### importStateHistory

```typescript
function importStateHistory(
  store: Store<any>,
  history: Array<{ action: string; state: any }>
): void;
```

Import a previously exported history.

## Advanced Use Cases

### Conditional DevTools

```typescript
const middleware = [];

if (process.env.NODE_ENV === 'development') {
  middleware.push(createDevToolsMiddleware({ name: 'AppStore' }));
}

const store = createStore(initialState, actions, { middleware });
```

### Multiple Stores with DevTools

```typescript
const userStore = createStore(userState, userActions, {
  middleware: [createDevToolsMiddleware({ name: 'Users' })],
});

const todoStore = createStore(todoState, todoActions, {
  middleware: [createDevToolsMiddleware({ name: 'Todos' })],
});

const settingsStore = createStore(settingsState, settingsActions, {
  middleware: [createDevToolsMiddleware({ name: 'Settings' })],
});
```

Switch between them in DevTools to debug each independently.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

MIT
