# @polystate/cli

Command-line tool for Polystate code generation.

Generates React Redux or Angular NgRx store code from framework-agnostic store definitions.

## Installation

```bash
npm install --save-dev @polystate/cli
```

Or use directly with npx:

```bash
npx @polystate/cli generate store.definition.ts
```

## Usage

### Generate Code

```bash
# Generate both React and Angular (default)
npx polystate generate store.definition.ts

# Generate React only
npx polystate generate store.definition.ts --react

# Generate Angular only
npx polystate generate store.definition.ts --angular

# Specify output directory
npx polystate generate store.definition.ts --out-dir src/store

# Overwrite existing files
npx polystate generate store.definition.ts --overwrite
```

### Validate Definition

```bash
npx polystate validate store.definition.ts
```

## Store Definition File

Create a `store.definition.ts` file:

```typescript
import { StoreDefinition } from '@polystate/definition';

export const todoDefinition: StoreDefinition = {
  name: 'todo',
  initialState: {
    todos: [] as Array<{ id: number; title: string; done: boolean }>,
    filter: 'all' as string,
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
    setFilter: (state, filter: string) => ({
      ...state,
      filter,
    }),
  },
  description: 'Todo store with filtering',
};
```

## Output

### React Output

```
src/store/
├── store.ts          # Redux store, actions, middleware
├── hooks.ts          # React hooks
└── types.ts          # TypeScript types
```

### Angular Output

```
src/store/
├── state.ts          # State interface
├── actions.ts        # NgRx actions
├── reducer.ts        # Reducer function
├── selectors.ts      # Memoized selectors
├── facade.ts         # Service facade
└── store.module.ts   # Angular module
```

## Features

- ✅ Framework-agnostic store definitions
- ✅ Generate production-ready Redux code
- ✅ Generate production-ready NgRx code
- ✅ Definition validation
- ✅ Built-in middleware and features
- ✅ Full TypeScript support

## License

MIT
