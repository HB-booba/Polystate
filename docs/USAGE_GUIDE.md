# Polystate Usage Guide

This guide shows how to use Polystate in simple and complex situations for both React and Angular.

Polystate supports two development styles:

1. Runtime mode: use `@polystate/core` directly with `@polystate/react` or `@polystate/angular`.
2. Code generation mode: define state once with `@polystate/definition`, then generate Redux for React or NgRx for Angular with the CLI.

## When To Use Each Mode

Use runtime mode when:

1. You want the smallest setup.
2. You are building one app in one framework.
3. You want to keep everything in one file or one service.

Use code generation mode when:

1. You need native Redux or NgRx output.
2. You want one framework-agnostic definition shared across React and Angular.
3. You want generated selectors, actions, facades, hooks, and store structure.

## Install

### React Runtime

```bash
npm install @polystate/core @polystate/react react react-dom
```

### Angular Runtime

```bash
npm install @polystate/core @polystate/angular @angular/core rxjs
```

### Code Generation

```bash
npm install --save-dev @polystate/cli @polystate/definition
```

Validate and stale-check commands:

```bash
# Validate a definition file
npx polystate validate store.definition.ts

# Check generated files are current
npx polystate check store.definition.ts --react --store-dir src/store
```

## React: Simple Runtime Example

This is the fastest way to get started in React.

```ts
import { createStore } from '@polystate/core';

export const counterStore = createStore(
  { count: 0 },
  {
    increment: (state) => ({ ...state, count: state.count + 1 }),
    decrement: (state) => ({ ...state, count: state.count - 1 }),
    setCount: (state, count: number) => ({ ...state, count }),
  }
);
```

```tsx
import { useDispatch, useStore } from '@polystate/react';
import { counterStore } from './counter.store';

export function Counter() {
  const state = useStore(counterStore);
  const { dispatch } = useDispatch(counterStore);

  return (
    <section>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch('decrement')}>-</button>
      <button onClick={() => dispatch('increment')}>+</button>
      <button onClick={() => dispatch('setCount', 10)}>Reset to 10</button>
    </section>
  );
}
```

Why this works well:

1. `createStore` keeps state and actions framework-agnostic.
2. `useStore` subscribes to the full state.
3. `useDispatch` sends actions without introducing Redux boilerplate.

## React: Complex Runtime Example

This pattern is better when state is shared across many components and only parts of the state should trigger re-renders.

```ts
import { createStore } from '@polystate/core';

export interface TodoState {
  todos: Array<{ id: number; title: string; done: boolean }>;
  filter: 'all' | 'active' | 'completed';
  loading: boolean;
  error: string | null;
}

export const todoStore = createStore<TodoState>(
  {
    todos: [],
    filter: 'all',
    loading: false,
    error: null,
  },
  {
    addTodo: (state, title: string) => ({
      ...state,
      todos: [...state.todos, { id: Date.now(), title, done: false }],
    }),
    toggleTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      ),
    }),
    removeTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.filter((todo) => todo.id !== id),
    }),
    setFilter: (state, filter: TodoState['filter']) => ({
      ...state,
      filter,
    }),
    setLoading: (state, loading: boolean) => ({
      ...state,
      loading,
    }),
    setError: (state, error: string | null) => ({
      ...state,
      error,
    }),
  }
);
```

```tsx
import { createStoreHooks } from '@polystate/react';
import { todoStore } from './todo.store';

const {
  useSelector: useTodoSelector,
  useDispatch: useTodoDispatch,
} = createStoreHooks(todoStore);

export function TodoToolbar() {
  const filter = useTodoSelector((state) => state.filter);
  const loading = useTodoSelector((state) => state.loading);
  const { dispatch } = useTodoDispatch();

  return (
    <header>
      <span>Current filter: {filter}</span>
      <button disabled={loading} onClick={() => dispatch('setFilter', 'all')}>All</button>
      <button disabled={loading} onClick={() => dispatch('setFilter', 'active')}>Active</button>
      <button disabled={loading} onClick={() => dispatch('setFilter', 'completed')}>Completed</button>
    </header>
  );
}

export function TodoList() {
  const todos = useTodoSelector((state) => state.todos);
  const filter = useTodoSelector((state) => state.filter);
  const { dispatch } = useTodoDispatch();

  const filtered = todos.filter((todo) => {
    if (filter === 'active') return !todo.done;
    if (filter === 'completed') return todo.done;
    return true;
  });

  return (
    <ul>
      {filtered.map((todo) => (
        <li key={todo.id}>
          <label>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => dispatch('toggleTodo', todo.id)}
            />
            {todo.title}
          </label>
          <button onClick={() => dispatch('removeTodo', todo.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

Use this pattern when:

1. Multiple components need different slices of state.
2. You want selective subscriptions through `useSelector`.
3. You want pre-bound hooks through `createStoreHooks`.

## React: Simple Code Generation Example

Create a definition file once:

```ts
import type { StoreDefinition } from '@polystate/definition';

export const counterDefinition = {
  name: 'counter',
  initialState: {
    count: 0,
  },
  actions: {
    increment: (state) => ({ ...state, count: state.count + 1 }),
    decrement: (state) => ({ ...state, count: state.count - 1 }),
    setCount: (state, count: number) => ({ ...state, count }),
  },
} satisfies StoreDefinition;
```

Generate Redux code:

```bash
npx polystate generate counter.definition.ts --react --out-dir src/store --overwrite
```

Use the generated code:

```tsx
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useCounterDispatch, useCounterState } from './store/hooks';

function CounterView() {
  const state = useCounterState();
  const { increment, decrement, setCount } = useCounterDispatch();

  return (
    <section>
      <p>{state.count}</p>
      <button onClick={decrement}>-</button>
      <button onClick={increment}>+</button>
      <button onClick={() => setCount(20)}>Set 20</button>
    </section>
  );
}

export function App() {
  return (
    <Provider store={store}>
      <CounterView />
    </Provider>
  );
}
```

## React: Complex Code Generation Example

This is the right fit when you want a real Redux store but do not want to hand-write actions, slices, selectors, and hook wrappers.

```ts
import { StoreDefinition } from '@polystate/definition';

export const projectDefinition: StoreDefinition = {
  name: 'project',
  initialState: {
    items: [] as Array<{ id: string; name: string; owner: string; archived: boolean }> ,
    selectedOwner: 'all' as 'all' | 'engineering' | 'design' | 'product',
    search: '',
    loading: false,
    lastSyncedAt: 0,
  },
  actions: {
    replaceItems: (state, items: Array<{ id: string; name: string; owner: string; archived: boolean }>) => ({
      ...state,
      items,
      lastSyncedAt: Date.now(),
    }),
    setSelectedOwner: (state, selectedOwner: 'all' | 'engineering' | 'design' | 'product') => ({
      ...state,
      selectedOwner,
    }),
    setSearch: (state, search: string) => ({
      ...state,
      search,
    }),
    toggleArchived: (state, id: string) => ({
      ...state,
      items: state.items.map((item) =>
        item.id === id ? { ...item, archived: !item.archived } : item
      ),
    }),
    setLoading: (state, loading: boolean) => ({
      ...state,
      loading,
    }),
  },
};
```

Recommended flow:

1. Keep this definition close to the domain, not inside UI code.
2. Generate Redux output into a dedicated `src/store` folder.
3. Use generated selectors and dispatch hooks from components.
4. Keep server calls outside the reducer layer, then dispatch generated actions with normalized payloads.

## Angular: Simple Runtime Example

Use `createAngularService` when you want a concise service without wiring the store manually.

```ts
import { Injectable } from '@angular/core';
import { createAngularService } from '@polystate/angular';

interface CounterState {
  count: number;
}

@Injectable({ providedIn: 'root' })
export class CounterService extends createAngularService<CounterState>(
  { count: 0 },
  {
    increment: (state) => ({ ...state, count: state.count + 1 }),
    decrement: (state) => ({ ...state, count: state.count - 1 }),
    setCount: (state, count: number) => ({ ...state, count }),
  }
) {
  count = this.select((state) => state.count);
  count$ = this.select$((state) => state.count);

  increment() {
    return this.dispatch('increment');
  }

  decrement() {
    return this.dispatch('decrement');
  }

  setCount(count: number) {
    return this.dispatch('setCount', count);
  }
}
```

```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CounterService } from './counter.service';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section>
      <p>Signal count: {{ counter.count() }}</p>
      <p>Observable count: {{ counter.count$ | async }}</p>
      <button (click)="counter.decrement()">-</button>
      <button (click)="counter.increment()">+</button>
    </section>
  `,
})
export class CounterComponent {
  constructor(public counter: CounterService) {}
}
```

## Angular: Complex Runtime Example

Use a custom service class when you want explicit state selectors, helper methods, and derived Angular signals.

```ts
import { Injectable, computed } from '@angular/core';
import { createStore } from '@polystate/core';
import { PolystateService } from '@polystate/angular';

interface DashboardState {
  widgets: Array<{ id: string; title: string; visible: boolean }>;
  selectedWidgetId: string | null;
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService extends PolystateService<DashboardState> {
  protected store = createStore<DashboardState>(
    {
      widgets: [],
      selectedWidgetId: null,
      loading: false,
      error: null,
    },
    {
      setWidgets: (state, widgets: DashboardState['widgets']) => ({
        ...state,
        widgets,
      }),
      toggleVisibility: (state, id: string) => ({
        ...state,
        widgets: state.widgets.map((widget) =>
          widget.id === id ? { ...widget, visible: !widget.visible } : widget
        ),
      }),
      selectWidget: (state, selectedWidgetId: string | null) => ({
        ...state,
        selectedWidgetId,
      }),
      setLoading: (state, loading: boolean) => ({
        ...state,
        loading,
      }),
      setError: (state, error: string | null) => ({
        ...state,
        error,
      }),
    }
  );

  widgets = this.select((state) => state.widgets);
  selectedWidgetId = this.select((state) => state.selectedWidgetId);
  loading = this.select((state) => state.loading);
  error = this.select((state) => state.error);

  visibleWidgets = computed(() =>
    this.widgets().filter((widget) => widget.visible)
  );

  selectedWidget = computed(() =>
    this.widgets().find((widget) => widget.id === this.selectedWidgetId()) ?? null
  );

  widgets$ = this.select$((state) => state.widgets);

  toggleVisibility(id: string) {
    return this.dispatch('toggleVisibility', id);
  }

  selectWidget(id: string | null) {
    return this.dispatch('selectWidget', id);
  }
}
```

Use this pattern when:

1. Angular templates need both Signals and Observables.
2. You want derived values with `computed`.
3. You want to keep all state behavior inside a service boundary.

## Angular: Simple Code Generation Example

Create one definition and generate NgRx output.

```ts
import { StoreDefinition } from '@polystate/definition';

export const counterDefinition: StoreDefinition = {
  name: 'counter',
  initialState: {
    count: 0,
  },
  actions: {
    increment: (state) => ({ ...state, count: state.count + 1 }),
    decrement: (state) => ({ ...state, count: state.count - 1 }),
    setCount: (state, count: number) => ({ ...state, count }),
  },
};
```

```bash
npx polystate generate counter.definition.ts --angular --out-dir src/app/store --overwrite
```

Typical usage in Angular:

```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CounterFacade } from './store/facade';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p>{{ facade.count$ | async }}</p>
    <button (click)="facade.decrement()">-</button>
    <button (click)="facade.increment()">+</button>
  `,
})
export class CounterComponent {
  constructor(public facade: CounterFacade) {}
}
```

## Angular: Complex Code Generation Example

This mode is best when Angular applications already standardize on NgRx, but you still want a single framework-agnostic source of truth.

Recommended structure:

1. Write one `store.definition.ts` per domain area.
2. Generate into `src/app/store/<domain>` if you want multiple generated stores.
3. Register generated `StoreModule` feature modules where needed.
4. Use generated facades from components and feature services.

Suggested domain examples:

1. User preferences with strict union filters.
2. Project dashboards with selection and visibility flags.
3. Ticketing flows with multiple collections and derived selectors.
4. Shared state definitions reused by React and Angular frontends.

## Cross-Framework Shared Definition Example

This is the main Polystate value proposition.

```ts
import { StoreDefinition } from '@polystate/definition';

export const notificationDefinition: StoreDefinition = {
  name: 'notification',
  initialState: {
    items: [] as Array<{ id: string; message: string; level: 'info' | 'warning' | 'error'; read: boolean }>,
    loading: false,
  },
  actions: {
    setNotifications: (state, items: Array<{ id: string; message: string; level: 'info' | 'warning' | 'error'; read: boolean }>) => ({
      ...state,
      items,
    }),
    markRead: (state, id: string) => ({
      ...state,
      items: state.items.map((item) =>
        item.id === id ? { ...item, read: true } : item
      ),
    }),
    setLoading: (state, loading: boolean) => ({
      ...state,
      loading,
    }),
  },
};
```

Generate both outputs:

```bash
npx polystate generate notification.definition.ts --react --angular --overwrite
```

This gives you:

1. Redux output for React.
2. NgRx output for Angular.
3. One domain model and one action definition source.

## Recommended Project Patterns

### Small App

Use runtime mode.

1. One store per feature.
2. Use `createStoreHooks` in React.
3. Use `createAngularService` in Angular.

### Medium App

Use runtime mode or code generation depending on team preference.

1. Keep one file for domain types and one for store definition.
2. Expose domain-specific helper methods from services or hooks.
3. Prefer selectors over subscribing to the whole state.

### Large App Or Multi-Framework Team

Use code generation.

1. Store the framework-agnostic definition in a shared package.
2. Generate React and Angular outputs into each app.
3. Keep server integration outside reducers and dispatch normalized payloads.
4. Version shared definitions as part of the domain contract.

## Practical Limits

Polystate is strongest when:

1. Your actions are pure and immutable.
2. State can be expressed as serializable objects.
3. You want shared domain logic across frameworks.

Be careful when:

1. Reducer logic becomes highly dynamic or metaprogrammed.
2. You need advanced async orchestration that is not yet first-class in the generator.
3. You rely on generated output typing for very complex TypeScript signatures, because that area is still evolving.

## Suggested Workflow

1. Start with a runtime store to validate the domain model quickly.
2. Move to code generation once the domain is stable and shared.
3. Keep actions immutable and explicit.
4. Add integration tests against the generated output for critical features.

## Related Files In This Repository

1. Runtime React example: [examples/react-todo/src/App.tsx](examples/react-todo/src/App.tsx)
2. Runtime Angular example: [examples/angular-todo/src/app/todo.service.ts](examples/angular-todo/src/app/todo.service.ts)
3. Generated React example definition: [examples/react-todo-generated/store.definition.ts](examples/react-todo-generated/store.definition.ts)
4. Generated Angular example definition: [examples/angular-todo-generated/store.definition.ts](examples/angular-todo-generated/store.definition.ts)
5. CLI package docs: [packages/cli/README.md](packages/cli/README.md)
6. React package docs: [packages/react/README.md](packages/react/README.md)
7. Angular package docs: [packages/angular/README.md](packages/angular/README.md)