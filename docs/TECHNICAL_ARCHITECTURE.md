# Polystate — Technical Architecture Guide

## 📋 Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Code Generation Pipeline](#code-generation-pipeline)
3. [Runtime Adapter Pipeline](#runtime-adapter-pipeline)
4. [Build & Compilation Process](#build--compilation-process)
5. [File-by-File Breakdown](#file-by-file-breakdown)
6. [Data Flow Examples](#data-flow-examples)

---

## High-Level Overview

Polystate has **two execution paths**:

```
Path 1: Code Generation (recommended for production)
┌─────────────────────────────────────────────┐
│ User writes store.definition.ts              │
│ (framework-agnostic state shape + actions)   │
└────────────────┬────────────────────────────┘
                 │
                 ↓
        ┌─────────────────┐
        │  @polystate/cli │
        │  (entry point)  │
        └────────┬────────┘
                 │
        ┌────────┴────────┐
        ↓                 ↓
┌──────────────────┐  ┌──────────────────┐
│ generator-react  │  │generator-angular │
│ (generates Redux)│  │ (generates NgRx) │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         ↓                     ↓
    src/store/*.ts         src/app/store/*
    (ready to use)         (ready to use)


Path 2: Runtime Adapters (for development/rapid prototyping)
┌────────────────────────────────────┐
│ User code imports @polystate/core  │
│         (or @polystate/react)      │
│         (or @polystate/angular)    │
└────────────┬───────────────────────┘
             │
             ↓
    ┌──────────────────┐
    │ Runtime usage    │
    │ (no compilation) │
    └──────────────────┘
```

---

## Code Generation Pipeline

### Entry Point: `packages/cli/src/cli.ts`

```typescript
// CLI receives: polystate generate store.definition.ts --react --angular

1. PARSE CLI ARGUMENTS
   └─ Read file path, flags (--react, --angular, --output-dir)

2. REQUIRE DEFINITION FILE
   └─ Dynamic import: require('./store.definition.ts')
   └─ Returns: StoreDefinition object

3. VALIDATE DEFINITION
   ├─ Call: @polystate/definition validateStoreDefinition()
   ├─ Check: name format, initialState shape, action handlers
   └─ Return: { valid, errors, warnings }

4. NORMALIZE DEFINITION
   ├─ Call: @polystate/definition normalizeStoreDefinition()
   ├─ Ensures: all required fields present
   └─ Return: normalized StoreDefinition

5. GENERATE CODE
   ├─ IF --react flag:
   │   └─ Call: @polystate/generator-react generateReact()
   │       └─ Returns: { store.ts, hooks.ts, types.ts }
   │
   └─ IF --angular flag:
       └─ Call: @polystate/generator-angular generateAngular()
           └─ Returns: { state.ts, actions.ts, reducer.ts, ... }

6. WRITE FILES TO DISK
   └─ Write each generated file to output directory
```

**Key file:** [packages/cli/src/cli.ts](packages/cli/src/cli.ts)

```typescript
async function main() {
  const args = parseArgs(process.argv);
  const definition = require(args.filePath).default;

  validateStoreDefinition(definition);
  const normalized = normalizeStoreDefinition(definition);

  if (args.react) {
    const files = generateReact(normalized);
    fs.writeFileSync('src/store/store.ts', files.store);
    fs.writeFileSync('src/store/hooks.ts', files.hooks);
    // ... write types, index, etc
  }

  if (args.angular) {
    const files = generateAngular(normalized);
    fs.writeFileSync('src/app/store/state.ts', files.state);
    fs.writeFileSync('src/app/store/actions.ts', files.actions);
    // ... write reducer, selectors, facade, module
  }
}
```

---

### Stage 1: Definition Validation & Extraction

**File:** [packages/definition/src/types.ts](packages/definition/src/types.ts)

Defines the `StoreDefinition` interface:

```typescript
export interface StoreDefinition<T = any> {
  name: string; // e.g., "todos"
  initialState: T; // e.g., { todos: [], filter: 'all' }
  actions: Record<string, ActionHandler>; // e.g., { addTodo: (s, title) => ... }
  description?: string; // optional
}

export type ActionHandler<T = any> = (state: T, payload?: unknown) => T;
```

**File:** [packages/definition/src/validator.ts](packages/definition/src/validator.ts)

Validates the definition:

```typescript
export function validateStoreDefinition(def: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check name format: lowercase, alphanumeric, hyphens
  if (!isValidName(def.name)) {
    errors.push(`Invalid name: "${def.name}"`);
  }

  // Check initialState exists and is object
  if (!def.initialState || typeof def.initialState !== 'object') {
    errors.push('initialState must be a plain object');
  }

  // Check actions is object with functions
  if (!def.actions || typeof def.actions !== 'object') {
    errors.push('actions must be an object');
  }

  for (const [actionName, handler] of Object.entries(def.actions)) {
    if (typeof handler !== 'function') {
      errors.push(`Action "${actionName}" must be a function`);
    }
    // Check arity: (state) => T or (state, payload) => T
    if (handler.length > 2) {
      errors.push(`Action "${actionName}" has too many parameters`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

**File:** [packages/definition/src/index.ts](packages/definition/src/index.ts)

Exports `extractActions()` — used by generators:

```typescript
export function extractActions(def: StoreDefinition) {
  return Object.entries(def.actions).map(([name, handler]) => ({
    name,
    handler,
    paramCount: handler.length, // 1 = no payload, 2 = has payload
    description: handler.description || '',
  }));
}
```

This is crucial for code generation — generators know from `paramCount` whether an action accepts a payload.

---

### Stage 2: React Code Generation

**File:** [packages/generator-react/src/generator.ts](packages/generator-react/src/generator.ts)

Main generator function:

```typescript
export function generateReact(def: StoreDefinition) {
  return {
    store: generateStore(def), // Redux store + actions
    hooks: generateHooks(def), // useDispatch, useSelector hooks
    types: generateTypes(def), // TypeScript types
    index: generateIndex(def), // Export barrel
  };
}

function generateStore(def: StoreDefinition): string {
  return `
    import { configureStore } from '@reduxjs/toolkit';
    import { createSlice } from '@reduxjs/toolkit';
    import { persistReducer } from 'redux-persist';
    import storage from 'redux-persist/lib/storage';
    
    // ⚠️ BLOCKER: generateReducers() returns stubs!
    const ${def.name}Slice = createSlice({
      name: '${def.name}',
      initialState: ${JSON.stringify(def.initialState)},
      reducers: generateReducers(def)  // ❌ BUG: Returns { addTodo: (state) => state }
    });
    
    const persistConfig = { key: 'root', storage };
    const persistedReducer = persistReducer(persistConfig, ${def.name}Slice.reducer);
    
    export const store = configureStore({
      reducer: persistedReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
          .use(loggerMiddleware)
          .use(devToolsMiddleware)
    });
  `;
}

function generateReducers(def: StoreDefinition): string {
  // ❌ KNOWN BUG: Should serialize action handler logic
  // Current (broken):
  return def.actions.map((action) => `${action.name}: (state) => state`).join(',\n');

  // Should be (fixed):
  // return def.actions
  //   .map(action => `${action.name}: (state, action) => {
  //     // Serialize the actual handler logic from def.actions[action.name]
  //     ${serializeHandler(def.actions[action.name])}
  //   }`)
  //   .join(',\n');
}

function generateHooks(def: StoreDefinition): string {
  return `
    import { useDispatch, useSelector } from 'react-redux';
    import { ${def.name}Slice } from './store';
    
    export function use${capitalize(def.name)}Dispatch() {
      const dispatch = useDispatch();
      
      return {
        ${extractActions(def)
          .map(
            (action) => `
            ${action.name}: (payload) => 
              dispatch(${def.name}Slice.actions.${action.name}(payload))
          `
          )
          .join(',\n')}
      };
    }
    
    export function use${capitalize(def.name)}(
      selector = (state) => state.${def.name}
    ) {
      return useSelector(selector);
    }
  `;
}

function generateTypes(def: StoreDefinition): string {
  return `
    export interface ${capitalize(def.name)}State {
      ${Object.entries(def.initialState)
        .map(([key, value]) => `${key}: typeof ${JSON.stringify(value)}`)
        .join(';\n')}
    }
    
    export interface ${capitalize(def.name)}Actions {
      ${extractActions(def)
        .map((action) => {
          const paramType = action.paramCount === 2 ? 'unknown' : 'void';
          return `${action.name}(payload: ${paramType}): void`;
        })
        .join(';\n')}
    }
  `;
}
```

**Output:** 3 files written to `src/store/`

- `store.ts` — Redux store configuration + actions + middleware
- `hooks.ts` — React hooks for dispatching actions and selecting state
- `types.ts` — TypeScript type definitions
- `index.ts` — Re-exports everything

---

### Stage 3: Angular Code Generation

**File:** [packages/generator-angular/src/generator.ts](packages/generator-angular/src/generator.ts)

```typescript
export function generateAngular(def: StoreDefinition) {
  return {
    state: generateState(def), // State interface
    actions: generateActions(def), // NgRx actions
    reducer: generateReducer(def), // reducer function
    selectors: generateSelectors(def), // memoized selectors
    facade: generateFacade(def), // service facade
    effects: generateEffects(def), // side effects (empty by default)
    storeModule: generateStoreModule(def), // Angular module imports/exports
  };
}

function generateState(def: StoreDefinition): string {
  return `
    export interface ${capitalize(def.name)}State {
      ${Object.entries(def.initialState)
        .map(([k, v]) => `readonly ${k}: ${typeof v}`)
        .join(';\n')}
    }
    
    export const initial${capitalize(def.name)}State: ${capitalize(def.name)}State = 
      ${JSON.stringify(def.initialState)};
  `;
}

function generateActions(def: StoreDefinition): string {
  return `
    import { createAction, props } from '@ngrx/store';
    
    ${extractActions(def)
      .map((action) => {
        if (action.paramCount === 1) {
          return `export const ${action.name} = createAction(
            '[${capitalize(def.name)}] ${action.name}'
          );`;
        } else {
          return `export const ${action.name} = createAction(
            '[${capitalize(def.name)}] ${action.name}',
            props<{ payload: unknown }>()
          );`;
        }
      })
      .join('\n\n')}
  `;
}

function generateReducer(def: StoreDefinition): string {
  // ❌ BLOCKER: generateReducerHandlers() returns stubs!
  return `
    import { createReducer, on } from '@ngrx/store';
    import * as ${capitalize(def.name)}Actions from './actions';
    import { initial${capitalize(def.name)}State } from './state';
    
    export const ${def.name}Reducer = createReducer(
      initial${capitalize(def.name)}State,
      ${generateReducerHandlers(def)}  // ❌ Returns stub handlers
    );
  `;
}

function generateReducerHandlers(def: StoreDefinition): string {
  // ❌ BROKEN: Returns stub handlers
  return extractActions(def)
    .map((action) => `on(${capitalize(def.name)}Actions.${action.name}, (state) => state)`)
    .join(',\n');

  // Should serialize actual handler logic:
  // return extractActions(def)
  //   .map(action => {
  //     const handler = serializeHandler(def.actions[action.name]);
  //     return `on(
  //       ${capitalize(def.name)}Actions.${action.name},
  //       (state, action) => {
  //         ${handler}
  //       }
  //     )`;
  //   })
  //   .join(',\n');
}

function generateSelectors(def: StoreDefinition): string {
  return `
    import { createFeatureSelector, createSelector } from '@ngrx/store';
    import { ${capitalize(def.name)}State } from './state';
    
    export const select${capitalize(def.name)}State = 
      createFeatureSelector<${capitalize(def.name)}State>('${def.name}');
    
    ${Object.keys(def.initialState)
      .map(
        (key) =>
          `export const select${capitalize(key)} = createSelector(
          select${capitalize(def.name)}State,
          (state) => state.${key}
        );`
      )
      .join('\n\n')}
  `;
}

function generateFacade(def: StoreDefinition): string {
  return `
    import { Injectable } from '@angular/core';
    import { Store } from '@ngrx/store';
    import * as ${capitalize(def.name)}Actions from './actions';
    import * as selectors from './selectors';
    
    @Injectable({ providedIn: 'root' })
    export class ${capitalize(def.name)}Facade {
      // Observables for state slices
      ${Object.keys(def.initialState)
        .map((key) => `${key}$ = this.store.select(selectors.select${capitalize(key)});`)
        .join('\n')}
      
      constructor(private store: Store) {}
      
      // Action dispatchers
      ${extractActions(def)
        .map((action) => {
          if (action.paramCount === 1) {
            return `${action.name}() { this.store.dispatch(${capitalize(def.name)}Actions.${action.name}()); }`;
          } else {
            return `${action.name}(payload: unknown) { this.store.dispatch(${capitalize(def.name)}Actions.${action.name}({ payload })); }`;
          }
        })
        .join('\n')}
    }
  `;
}

function generateStoreModule(def: StoreDefinition): string {
  return `
    import { NgModule } from '@angular/core';
    import { StoreModule } from '@ngrx/store';
    import { ${def.name}Reducer } from './reducer';
    
    @NgModule({
      imports: [
        StoreModule.forFeature('${def.name}', ${def.name}Reducer)
      ],
      providers: [${capitalize(def.name)}Facade]
    })
    export class ${capitalize(def.name)}StoreModule {}
  `;
}
```

**Output:** 6 files written to `src/app/store/`

- `state.ts` — State interface + initial state
- `actions.ts` — NgRx action creators
- `reducer.ts` — Reducer function with action handlers
- `selectors.ts` — Memoized selectors with createSelector
- `facade.ts` — Service providing simple API to components
- `store.module.ts` — Angular module for StoreFeature

---

## Runtime Adapter Pipeline

For applications using **runtime mode** (not code generation), Polystate provides direct imports:

```typescript
// React
import { createStore } from '@polystate/core';
import { useStore, useSelector, useDispatch } from '@polystate/react';

// Angular
import { createStore } from '@polystate/core';
import { createAngularService } from '@polystate/angular';
```

### Core Runtime: `packages/core/src/store.ts`

```typescript
export interface Store<T> {
  getState(): T;
  setState(state: T): void;

  dispatch(action: string, payload?: unknown): void | Promise<any>;

  subscribe(listener: (state: T) => void): Unsubscribe;
  subscribeSelective<S>(selector: (state: T) => S, listener: (selected: S) => void): Unsubscribe;

  use(middleware: Middleware<T>): void;
}

export function createStore<T>(
  initialState: T,
  actions: Record<string, ActionHandler<T>>,
  options?: StoreOptions<T>
): Store<T> {
  // 1. Create Signal (reactive primitive)
  const signal = new Signal(initialState);

  // 2. Create store instance
  const store = new StoreImpl(signal, actions, options);

  // 3. Attach middleware if provided
  if (options?.middleware) {
    options.middleware.forEach((m) => store.use(m));
  }

  // 4. Handle persistence if enabled
  if (options?.logging) {
    store.use(loggerMiddleware);
  }

  return store;
}

class StoreImpl<T> implements Store<T> {
  private signal: Signal<T>;
  private subscribers = new Set<(state: T) => void>();
  private selectiveSubscribers = new Map<(state: T) => unknown, Set<(value: unknown) => void>>();
  private middleware: Middleware<T>[] = [];
  private actionMap: Record<string, ActionHandler<T>>;

  constructor(
    signal: Signal<T>,
    actionMap: Record<string, ActionHandler<T>>,
    options?: StoreOptions<T>
  ) {
    this.signal = signal;
    this.actionMap = actionMap;
  }

  dispatch(action: string, payload?: unknown) {
    const prevState = this.signal.getValue();

    // Find action handler
    const handler = this.actionMap[action];
    if (!handler) {
      throw new Error(`Action "${action}" not found`);
    }

    // Execute handler (immutably update state)
    const nextState = handler(prevState, payload);

    // Update signal
    this.signal.setValue(nextState);

    // Notify subscribers
    this.notifySubscribers(prevState, nextState);

    // Execute middleware (after state update)
    for (const mw of this.middleware) {
      mw({
        action,
        payload,
        prevState,
        nextState,
        dispatch: (a, p) => this.dispatch(a, p),
      });
    }
  }

  private notifySubscribers(prevState: T, nextState: T) {
    // Global subscribers
    for (const listener of this.subscribers) {
      listener(nextState);
    }

    // Selective subscribers (only notify if value changed)
    for (const [selector, listeners] of this.selectiveSubscribers) {
      const prevValue = selector(prevState);
      const nextValue = selector(nextState);

      if (prevValue !== nextValue) {
        for (const listener of listeners) {
          listener(nextValue);
        }
      }
    }
  }
}
```

### React Adapter: `packages/react/src/hooks.ts`

Uses `useSyncExternalStore` (React 18+):

```typescript
import { useSyncExternalStore } from 'react';

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(
    (listener) => store.subscribe(listener), // subscribe
    () => store.getState(), // getSnapshot
    () => store.getState() // getServerSnapshot (SSR)
  );
}

export function useSelector<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(
    (listener) => store.subscribeSelective(selector, listener),
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}

export function useDispatch<T>(store: Store<T>) {
  return useMemo(() => ({ dispatch: store.dispatch.bind(store) }), [store]);
}
```

### Angular Adapter: `packages/angular/src/service.ts`

```typescript
export abstract class PolystateService<T> {
  protected store!: Store<T>; // ❌ BLOCKER: Never initialized!

  select<S>(selector: (state: T) => S): Signal<S> {
    // Uses Angular Signals
    const signal = signal(selector(this.store.getState()));

    this.store.subscribeSelective(selector, (value) => {
      signal.set(value);
    });

    return signal;
  }

  select$<S>(selector: (state: T) => S): Observable<S> {
    // Uses RxJS Observable
    const subject = new BehaviorSubject(selector(this.store.getState()));

    // ❌ BLOCKER: Memory leak - never unsubscribes!
    this.store.subscribeSelective(selector, (value) => {
      subject.next(value);
    });

    return subject.asObservable().pipe(distinctUntilChanged());
  }

  dispatch(action: string, payload?: unknown) {
    return this.store.dispatch(action, payload);
  }
}

// Factory function
export function createAngularService<T>(
  initialState: T,
  actions: Record<string, ActionHandler<T>>
) {
  // ❌ BLOCKER: Returns class where this.store is never set!
  return class extends PolystateService<T> {
    constructor() {
      super();
      // Should do: this.store = createStore(initialState, actions);
      // But doesn't!
    }
  };
}
```

---

## Build & Compilation Process

### Step 1: TypeScript Compilation → JavaScript

**Build tool:** `tsup` (configured in each package.json)

**File:** `packages/core/package.json`

```json
{
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts --sourcemap"
  }
}
```

**What happens:**

```
TypeScript (src/index.ts)
    ↓
[tsup compiler]
    ↓
├─ dist/index.js      (ESM: import/export)
├─ dist/index.cjs     (CJS: require/module.exports)
├─ dist/index.d.ts    (TypeScript definitions)
└─ dist/index.js.map  (Source map for debugging)
```

**Example for @polystate/core:**

Input: `packages/core/src/index.ts`

```typescript
export { Signal } from './signal';
export { createStore, type Store } from './store';
export { createSlice } from './slice';
export { loggerMiddleware, persistMiddleware } from './middleware';
export { asObservable } from './observable';
```

Output: `packages/core/dist/index.js`

```javascript
// ESM output
export { Signal } from './signal.js';
export { createStore } from './store.js';
// ... etc
```

Output: `packages/core/dist/index.cjs`

```javascript
// CJS output
const { Signal } = require('./signal.js');
const { createStore } = require('./store.js');

module.exports = {
  Signal,
  createStore,
  // ... etc
};
```

### Step 2: Monorepo Build Orchestration

**Build tool:** Nx

**File:** `nx.json`

```json
{
  "plugins": ["@nrwl/typescript"],
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"] // Build dependencies first
    }
  }
}
```

**Build order (dependency graph):**

```
@polystate/definition
    ↓
┌───┴──────────────────┐
↓                      ↓
@polystate/core        @polystate/devtools
    ↓
    ├─ @polystate/react
    ├─ @polystate/angular
    ├─ @polystate/generator-react
    └─ @polystate/generator-angular
         ↓
    @polystate/cli
```

**Command:** `npm run build`

```bash
# Runs in parallel (respecting dependency order):
nx build @polystate/definition
    ↓
nx build @polystate/core @polystate/devtools (parallel)
    ↓
nx build @polystate/react @polystate/angular (parallel)
    ↓
nx build @polystate/generator-react @polystate/generator-angular (parallel)
    ↓
nx build @polystate/cli
```

### Step 3: Package Publishing

**File:** `pnpm-lock.yaml` + `package.json`

```bash
# Run tests first
npm run test

# Build packages
npm run build

# Create changesets
pnpm changeset

# Bump versions based on changesets
pnpm changeset version

# Publish to npm
pnpm publish -r --access public

# Tag git
git tag v0.2.0
git push --tags
```

---

## File-by-File Breakdown

### `@polystate/definition`

| File               | Purpose                                   |
| ------------------ | ----------------------------------------- |
| `src/types.ts`     | `StoreDefinition<T>` interface definition |
| `src/validator.ts` | Validates definitions against schema      |
| `src/index.ts`     | Exports `extractActions()` for generators |

**Size:** ~2KB (no dependencies)

---

### `@polystate/core`

| File                | Purpose                                          | Key Exports                             |
| ------------------- | ------------------------------------------------ | --------------------------------------- |
| `src/signal.ts`     | Reactive primitive (getter/setter + subscribers) | `Signal<T>`                             |
| `src/store.ts`      | Main Store class + createStore factory           | `Store<T>`, `createStore()`             |
| `src/slice.ts`      | Slice for modular store definitions              | `createSlice()`, `prefixActions()`      |
| `src/middleware.ts` | Middleware system + built-in middleware          | `loggerMiddleware`, `persistMiddleware` |
| `src/observable.ts` | RxJS-compatible Observable wrapper               | `asObservable()`, operators             |
| `src/index.ts`      | Barrel export                                    | —                                       |

**Flow:** Signal → Store → Middleware → Subscribers notified

**Size:** ~13KB (minified), ~2.9KB (gzipped), **0 dependencies**

---

### `@polystate/react`

| File             | Purpose                          | Key Exports                                    |
| ---------------- | -------------------------------- | ---------------------------------------------- |
| `src/hooks.ts`   | useSyncExternalStore-based hooks | `useStore()`, `useSelector()`, `useDispatch()` |
| `src/context.ts` | React Context Provider + hook    | `createStoreContext()`                         |
| `src/index.ts`   | Barrel export                    | —                                              |

**Dependencies:** `react` (peer), `@polystate/core` (peer)

**Size:** ~1.6KB (minified), ~0.6KB (gzipped)

---

### `@polystate/angular`

| File             | Purpose                                   | Key Exports                                               |
| ---------------- | ----------------------------------------- | --------------------------------------------------------- |
| `src/service.ts` | PolystateService abstract class + factory | `PolystateService<T>`, `createAngularService()` ⚠️ BROKEN |
| `src/index.ts`   | Barrel export                             | —                                                         |

**Dependencies:** `@angular/core` (peer), `rxjs` (peer), `@polystate/core` (peer)

**Size:** ~3.2KB (minified), ~1.1KB (gzipped)

---

### `@polystate/generator-react`

| File               | Purpose                                     |
| ------------------ | ------------------------------------------- |
| `src/generator.ts` | Main generator: Redux store + hooks + types |
| `src/index.ts`     | Exports `generateReact()`                   |

**Input:** `StoreDefinition`
**Output:**

```
src/store/
├─ store.ts     (Redux store + configureStore)
├─ hooks.ts     (React hooks)
├─ types.ts     (TypeScript types)
└─ index.ts     (Re-exports)
```

**Key function:**

```typescript
generateReact(definition) → { store: string, hooks: string, types: string }
```

---

### `@polystate/generator-angular`

| File               | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `src/generator.ts` | Main generator: NgRx store + facade + module |
| `src/index.ts`     | Exports `generateAngular()`                  |

**Input:** `StoreDefinition`
**Output:**

```
src/app/store/
├─ state.ts      (State interface + initial)
├─ actions.ts    (NgRx @ngrx/store actions)
├─ reducer.ts    (Reducer function)
├─ selectors.ts  (createSelector memoized selectors)
├─ facade.ts     (Service facade)
├─ effects.ts    (Effects for async)
└─ store.module.ts (StoreFeature module)
```

---

### `@polystate/cli`

| File           | Purpose                                               |
| -------------- | ----------------------------------------------------- |
| `src/cli.ts`   | Entry point: parse args → validate → generate → write |
| `src/index.ts` | Exports CLI functions                                 |

**Flow:**

```
1. Parse: store.definition.ts + --react --angular
2. Require: Dynamic import definition file
3. Validate: Definition.validate()
4. Generate: generateReact() + generateAngular()
5. Write: fs.writeFileSync() to disk
```

---

### `@polystate/devtools`

| File                | Purpose                              | Status        |
| ------------------- | ------------------------------------ | ------------- |
| `src/middleware.ts` | Redux DevTools middleware bridge     | ⚠️ Incomplete |
| `src/index.ts`      | Exports `createDevToolsMiddleware()` | —             |

**Issue:** Infrastructure exists, not wired to browser extension (BLOCKER 3)

---

## Data Flow Examples

### Example 1: Runtime Mode (React)

```typescript
// 1. User creates store
const store = createStore(
  { todos: [] },
  {
    addTodo: (state, title) => ({
      ...state,
      todos: [...state.todos, { id: Date.now(), title, done: false }]
    })
  }
);

// 2. Component subscribes
function TodoApp() {
  const todos = useSelector(store, state => state.todos);
  //            ↑
  //            useSyncExternalStore(
  //              subscribe: store.subscribeSelective(selector, notify),
  //              getSnapshot: () => selector(store.getState())
  //            )

  const dispatch = useDispatch(store).dispatch;

  return <div onClick={() => dispatch('addTodo', 'New task')}></div>;
}

// 3. Dispatch triggers update
// - Handler executes: return newState
// - Signal updates: this.signal.setValue(newState)
// - Subscribers notified: selectiveSubscribers notify only if value changed
// - React re-renders: useSyncExternalStore triggers setState
```

### Example 2: Code Generation Mode (React)

```typescript
// 1. User creates definition
export default {
  name: 'todo',
  initialState: { todos: [], filter: 'all' },
  actions: {
    addTodo: (state, title) => ({ ...state, todos: [...state.todos, ...] })
  }
} satisfies StoreDefinition;

// 2. User runs CLI
$ polystate generate store.definition.ts --react

// 3. CLI generates files
//    - packages/generator-react/src/generator.ts:
//      ├─ generateStore() → src/store/store.ts
//      ├─ generateHooks() → src/store/hooks.ts
//      └─ generateTypes() → src/store/types.ts

// 4. User imports generated code
import { store } from './store/store';
import { useTodoDispatch, useTodos } from './store/hooks';

// 5. Uses like any Redux app
function App() {
  const todos = useTodos(state => state.todos);  // useSelector wrapper
  const { addTodo } = useTodoDispatch();          // useDispatch wrapper

  return <div onClick={() => addTodo('Task')}></div>;
}

// 6. Build process
//    - tsup compiles src/store/*.ts → JavaScript
//    - Bundler (Vite/Webpack) tree-shakes unused code
//    - Final bundle: Redux + app code
```

### Example 3: Code Generation Mode (Angular)

```typescript
// 1. Same definition as React

// 2. User runs CLI
$ polystate generate store.definition.ts --angular

// 3. CLI generates:
//    - src/app/store/state.ts (interface)
//    - src/app/store/actions.ts (NgRx actions)
//    - src/app/store/reducer.ts (reducer function)
//    - src/app/store/selectors.ts (createSelector)
//    - src/app/store/facade.ts (TodoFacade service)
//    - src/app/store/store.module.ts (StoreFeature)

// 4. User imports in module
import { TodoStoreModule } from './store/store.module';

@NgModule({
  imports: [TodoStoreModule, StoreModule.forRoot({})]
})
export class AppModule {}

// 5. User injects facade
@Component({...})
export class TodoComponent {
  constructor(public facade: TodoFacade) {}

  todos$ = this.facade.todos$;  // Observable<Todo[]>

  addTodo(title: string) {
    this.facade.addTodo(title);  // Dispatches NgRx action
  }
}

// 6. Data flow
//    - facade.addTodo() → dispatch(TodoActions.addTodo())
//    - SelectTodos selector → BehaviorSubject.next() → async pipe renders
```

---

## Build Output Structure

After `npm run build`:

```
packages/
├─ core/
│  └─ dist/
│     ├─ index.js         (ESM: ~13KB)
│     ├─ index.cjs        (CJS: ~13KB)
│     ├─ index.d.ts       (Types)
│     ├─ signal.js        (ESM)
│     ├─ signal.cjs       (CJS)
│     ├─ store.js         (ESM)
│     ├─ store.cjs        (CJS)
│     └─ ... (other files)
│
├─ react/
│  └─ dist/
│     ├─ index.js        (ESM: ~1.6KB)
│     ├─ index.cjs       (CJS: ~1.6KB)
│     ├─ hooks.js        (ESM)
│     ├─ hooks.cjs       (CJS)
│     └─ index.d.ts      (Types)
│
├─ generator-react/
│  └─ dist/
│     ├─ index.js        (Has generateReact function)
│     ├─ generator.js    (Actual generator logic)
│     └─ index.d.ts      (Types)
│
└─ cli/
   └─ dist/
      ├─ index.js        (Entry point executable)
      ├─ cli.js          (Main CLI logic)
      └─ index.d.ts      (Types)
```

---

## Summary

**Generation Pipeline:**

```
store.definition.ts
    → CLI @polystate/cli
    → Validate @polystate/definition
    → Generate @polystate/generator-{react,angular}
    → Write .ts files
    → tsup compile → .js .cjs
```

**Runtime Pipeline:**

```
import @polystate/core
    → createStore()
    → Attach middleware
    → Subscribe (React: useSyncExternalStore, Angular: BehaviorSubject)
    → dispatch() triggers handler → notifies subscribers
```

**Build Pipeline:**

```
tsup compiles TS → JS/CJS + Types
    → Nx orchestrates build order
    → pnpm publishes to npm
```

---

**Last Updated:** March 26, 2026
