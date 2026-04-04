# Polystate

**Framework-agnostic state management with code generation for React and Angular.**

Write your store definition once → generate native Redux + hooks **or** NgRx + services automatically.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-187%20passing-brightgreen.svg)](./vitest.config.ts)

---

## Two Modes

### Mode 1 — Code Generation ⭐ (Recommended)

Define your store once, generate production-ready framework-native code:

```bash
npx polystate generate store.definition.ts --react --angular
```

Output: real Redux (React) or real NgRx (Angular) — not wrappers. Zero Polystate dependency in generated code.

### Mode 2 — Runtime Adapters

Use Polystate directly at runtime with React or Angular adapters:

```typescript
import { createStore } from '@polystate/core';
import { useSelector, useDispatch } from '@polystate/react';
```

---

## Packages

| Package | Description | Size |
|---|---|---|
| `@polystate/definition` | Define stores — 0 dependencies | < 0.5 KB |
| `@polystate/generator-react` | Generate Redux + hooks | — |
| `@polystate/generator-angular` | Generate NgRx + services | — |
| `@polystate/cli` | `polystate generate / validate / check` | — |
| `@polystate/core` | Runtime core — 0 dependencies | < 1.5 KB |
| `@polystate/react` | React 18+ hooks | < 0.5 KB |
| `@polystate/angular` | Angular 17+ service | < 1 KB |
| `@polystate/devtools` | Redux DevTools bridge | — |

All sizes are gzipped.

---

## Quick Start — Code Generation

### 1. Define your store

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

### 2. Generate

```bash
npm install --save-dev @polystate/cli

npx polystate generate store.definition.ts --react    # Redux
npx polystate generate store.definition.ts --angular  # NgRx
npx polystate generate store.definition.ts --react --angular  # both
```

### 3. Use generated code

**React:**

```typescript
import { useTodoDispatch, useFilteredTodos } from './store/hooks';

function TodoApp() {
  const todos = useFilteredTodos();
  const { addTodo, removeTodo } = useTodoDispatch();
  // ...
}
```

**Angular:**

```typescript
import { TodoFacade } from './store/facade';

@Component({ /* ... */ })
export class TodosComponent {
  constructor(public facade: TodoFacade) {}
}
```

**Generated file structure:**

```
React                    Angular
src/store/               src/app/store/
├── store.ts             ├── state.ts
├── hooks.ts             ├── actions.ts
└── types.ts             ├── reducer.ts
                         ├── selectors.ts
                         ├── facade.ts
                         └── store.module.ts
```

---

## Quick Start — Runtime Adapters

### React

```bash
npm install @polystate/core @polystate/react
```

```typescript
import { createStore } from '@polystate/core';
import { useSelector, useDispatch } from '@polystate/react';

const store = createStore(
  { count: 0 },
  {
    increment: (s) => ({ ...s, count: s.count + 1 }),
    decrement: (s) => ({ ...s, count: s.count - 1 }),
  }
);

function Counter() {
  const count = useSelector(store, (s) => s.count);
  const { dispatch } = useDispatch(store);
  return <button onClick={() => dispatch('increment')}>{count}</button>;
}
```

### Angular

```bash
npm install @polystate/core @polystate/angular
```

```typescript
import { Injectable } from '@angular/core';
import { createAngularService } from '@polystate/angular';

@Injectable({ providedIn: 'root' })
export class CounterService extends createAngularService(
  { count: 0 },
  {
    increment: (s) => ({ ...s, count: s.count + 1 }),
    decrement: (s) => ({ ...s, count: s.count - 1 }),
  }
) {}

// In component:
// count = this.counter.select((s) => s.count);  // Angular Signal
// count$ = this.counter.select$((s) => s.count); // RxJS Observable
// this.counter.dispatch('increment');
```

---

## Performance

Benchmarked on Apple M-series:

| Operation | Throughput |
|---|---|
| `getState()` | ~23 M ops/sec |
| `dispatch` (simple action) | ~3.2 M ops/sec |
| `dispatch` with 100 subscribers | ~225 K ops/sec |
| `subscribe + unsubscribe` | ~5.4 M ops/sec |

---

## Why Polystate?

| | Redux | NgRx | Zustand | **Polystate** |
|---|---|---|---|---|
| Bundle size | 4.2 KB | large | 1.2 KB | **< 1.5 KB** |
| Boilerplate | High | Very high | Medium | **Low** |
| React support | ✅ | ❌ | ✅ | ✅ |
| Angular support | ❌ | ✅ | ❌ | ✅ |
| Code generation | ❌ | ❌ | ❌ | ✅ |
| Zero deps core | ❌ | ❌ | ❌ | ✅ |
| RxJS integration | ❌ | ✅ | ❌ | ✅ |
| DevTools | ✅ | ✅ | ❌ | ✅ |

---

## Documentation

Full API reference, advanced patterns, middleware, slices, observables, and migration guides:

**[→ docs/DOCUMENTATION.md](./docs/DOCUMENTATION.md)**

Per-package READMEs:

- [Core API](./packages/core/README.md)
- [React Adapter](./packages/react/README.md)
- [Angular Adapter](./packages/angular/README.md)
- [DevTools](./packages/devtools/README.md)
- [Definition](./packages/definition/README.md)
- [CLI Tool](./packages/cli/README.md)
- [React Generator](./packages/generator-react/README.md)
- [Angular Generator](./packages/generator-angular/README.md)

Additional guides in [`docs/`](./docs/):

- [Migration Guide](./docs/MIGRATION.md) — from Redux, NgRx, Zustand, React Context
- [Runtime vs Generated](./docs/RUNTIME_VS_GENERATED.md){} — how to choose
- [Technical Architecture](./docs/TECHNICAL_ARCHITECTURE.md) — internals deep dive
- [Usage Guide](./docs/USAGE_GUIDE.md) — advanced real-world patterns

---

## Examples

| Example | Description |
|---|---|
| [react-todo](./examples/react-todo/) | Runtime adapter with DevTools |
| [react-todo-generated](./examples/react-todo-generated/) | Generated Redux code (reference output) |
| [angular-todo](./examples/angular-todo/) | Runtime adapter (Angular 17) |
| [angular-todo-generated](./examples/angular-todo-generated/) | Generated NgRx code (reference output) |

---

## Development

```bash
git clone https://github.com/polystate/polystate.git
cd polystate
npm install

npm run build   # build all packages (tsup via Nx)
npm run test    # vitest — 187 tests
npm run lint    # eslint across all packages
npm run format  # prettier
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for pull-request guidelines and commit message conventions.

---

## License

[MIT](./LICENSE)
