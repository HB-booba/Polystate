# @polystate/definition

Framework-agnostic store definitions for Polystate code generation.

This package provides TypeScript types and validators for defining stores that can be used to generate React Redux or Angular NgRx implementations.

## Installation

```bash
npm install @polystate/definition
```

## Usage

### Define a Store

```typescript
import { StoreDefinition } from '@polystate/definition';

export const todoDefinition: StoreDefinition = {
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
    setFilter: (state, filter: string) => ({
      ...state,
      filter,
    }),
  },
  description: 'Todo store with filtering',
};
```

### Validate a Definition

```typescript
import { validateStoreDefinition } from '@polystate/definition';

const result = validateStoreDefinition(todoDefinition);
if (result.valid) {
  console.log('Definition is valid');
} else {
  console.error('Errors:', result.errors);
  console.warn('Warnings:', result.warnings);
}
```

## API

### Types

- `StoreDefinition<T>` - Complete store definition
- `ActionHandler<TState, TPayload>` - Action handler function
- `ActionMap<TState>` - Map of action handlers
- `ValidationResult` - Result of validation
- `GenerateOptions` - Code generation options
- `GenerationResult` - Result of code generation

### Functions

- `validateStoreDefinition(definition)` - Validate a store definition
- `normalizeStoreDefinition(definition)` - Normalize a definition
- `extractActions(definition)` - Extract action information

## License

MIT
