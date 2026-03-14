# @polystate/generator-react

React Redux code generator for Polystate store definitions.

Generates production-ready Redux stores, actions, and hooks from framework-agnostic store definitions.

## Installation

```bash
npm install --save-dev @polystate/generator-react @polystate/definition
```

## Usage

```typescript
import { generateReduxStore, generateHooks, generateTypes } from '@polystate/generator-react';
import { todoDefinition } from './store.definition';

// Generate store code
const storeCode = generateReduxStore(todoDefinition);
const hooksCode = generateHooks(todoDefinition);
const typesCode = generateTypes(todoDefinition);

// Write to files
fs.writeFileSync('store/store.ts', storeCode);
fs.writeFileSync('store/hooks.ts', hooksCode);
fs.writeFileSync('store/types.ts', typesCode);
```

## Generated Code

The generator automatically creates:

### `store.ts`

- Redux store configuration
- Slice with reducers
- Typed actions
- Redux DevTools integration
- Logger middleware (console logging)
- Persist middleware (localStorage)
- Memoized selectors with reselect

### `hooks.ts`

- Typed `useSelector` hook
- `useAppDispatch` hook
- `useStoreState` hook for entire state
- `useStoreDispatch` hook for all actions
- Individual selector hooks for each state property

### `types.ts`

- TypeScript types for state and actions

## Features

- ✅ Fully typed Redux store
- ✅ Memoized selectors (reselect)
- ✅ Built-in middleware (logging, persistence)
- ✅ Redux DevTools support
- ✅ Custom hooks for easy component integration
- ✅ Zero dependencies in generated code (uses redux-toolkit)

## License

MIT
