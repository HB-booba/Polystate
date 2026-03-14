# Polystate — TODO List with Copilot Prompts

## 🔴 4. Fix `distinctUntilChanged` sentinel bug

**File:** `packages/core/src/observable.ts`

**Problem:** `prev === Symbol('initial')` is always `false` after the first value because `Symbol('initial')` creates a new unique symbol on each evaluation. The operator never correctly suppresses the first duplicate.

**Copilot prompt:**

```
In packages/core/src/observable.ts, fix the distinctUntilChanged operator.
The bug: `prev === Symbol('initial')` is always false because Symbol() creates a new
unique value every call.

Fix using an initialized flag:
  let prev: T;
  let initialized = false;
  // in next():
  if (!initialized || !compare(prev, value)) {
    initialized = true;
    prev = value;
    observer.next?.(value);
  }

Add a test in packages/core/src/observable.test.ts that verifies the first value
is always emitted and that identical consecutive values are suppressed.
```

---

## 🟠 5. Fix `select$` subscription leak in Angular service

**File:** `packages/angular/src/service.ts`

**Problem:** `select$()` creates a `BehaviorSubject` and a subscription to the store observable that is never cleaned up. Angular services with `providedIn: 'root'` live forever, but feature-scoped services will leak.

**Copilot prompt:**

```
In packages/angular/src/service.ts, fix the select$() method in PolystateService.
The current implementation creates a subscription to the store observable but never
unsubscribes.

Fix:
1. Add a private destroy$ = new Subject<void>() to the class
2. Implement ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
3. In select$(), pipe the observable with takeUntil(this.destroy$)
4. Import Subject, takeUntil from rxjs

Make sure PolystateService implements OnDestroy from @angular/core.
```

---

## 🟠 6. Complete time-travel in DevTools middleware

**File:** `packages/devtools/src/middleware.ts`

**Problem:** The `JUMP_TO_ACTION` / `JUMP_TO_STATE` handler is empty — time travel does nothing.

**Copilot prompt:**

```
In packages/devtools/src/middleware.ts, implement time-travel in createDevToolsMiddleware.
The middleware needs a reference to the store to call setState() for time-travel.

Change the signature to:
  createDevToolsMiddleware<T>(store: Store<T>, config?: DevToolsConfig): Middleware<T>

In the devtools.subscribe() callback, when message.type === 'DISPATCH':
  - if payload.type === 'JUMP_TO_STATE': parse message.state (JSON) and call store.setState(parsed)
  - if payload.type === 'JUMP_TO_ACTION': find the state at that action index in actionHistory and call store.setState(it)

Update the devtools package README and the usage example in packages/devtools/src/middleware.ts.
Update packages/core/middleware.ts devToolsMiddleware() to match the new signature or
deprecate it in favor of the new createDevToolsMiddleware from @polystate/devtools.
```

---

## 🟠 7. Add type safety to `getTypeFromValue` in both generators

**Files:** `packages/generator-react/src/generator.ts`, `packages/generator-angular/src/generator.ts`

**Problem:** `getTypeFromValue` returns `'any[]'` for empty arrays and `'Record<string, any>'` for objects. The generated TypeScript types are too loose.

**Copilot prompt:**

```
In packages/generator-react/src/generator.ts and packages/generator-angular/src/generator.ts,
improve getTypeFromValue() to produce accurate TypeScript types.

For the todo example, given initialState.todos = [] as Array<{ id: number; title: string; done: boolean }>,
the function should detect the TypeScript cast and use that type.

Strategy:
- If the value has a TypeScript type annotation in the definition source (via generics), use it
- For objects, recursively generate { key: type; ... } interface shapes
- For empty arrays, keep 'any[]' but add a comment hint

Also fix the filter field: 'all' as 'all' | 'active' | 'completed' should generate
  filter: 'all' | 'active' | 'completed'
not
  filter: string

The generated state interface in the example is the reference spec.
```

---

## 🟠 8. Add `angular-todo` runtime example (missing)

**Problem:** The `examples/` folder is missing a runtime Angular example. Only `react-todo` (runtime) and the two generated examples exist.

**Copilot prompt:**

```
Create examples/angular-todo/ — a minimal Angular 17 app using @polystate/angular runtime adapter.

Structure:
  examples/angular-todo/
  ├── package.json          (depends on @polystate/core, @polystate/angular, @angular/core, @angular/common, rxjs)
  ├── angular.json
  ├── tsconfig.json
  └── src/
      ├── main.ts
      └── app/
          ├── app.component.ts    (uses TodoService)
          └── todo.service.ts     (extends createAngularService with todo state)

The service should expose:
  todos$ = this.select$((state) => state.todos)
  filter$ = this.select$((state) => state.filter)
  filteredTodos$ — computed from todos$ and filter$

The component template should use async pipe and call service.dispatch() directly.
Follow the same pattern as examples/react-todo/src/App.tsx.
```

---

## 🟡 9. Add generator tests

**File:** `packages/generator-react/src/generator.test.ts` (create), `packages/generator-angular/src/generator.test.ts` (create)

**Problem:** The generators have zero tests. After fixing them (tasks 2 and 3), they need regression coverage.

**Copilot prompt:**

```
Create packages/generator-react/src/generator.test.ts using Vitest.

Import generateReduxStore, generateHooks, generateTypes from './generator'.
Import todoDefinition from the example: examples/react-todo-generated/store.definition.ts.

Write tests:
1. generateReduxStore(todoDefinition) — output contains 'addTodo', 'toggleTodo', 'removeTodo', 'setFilter'
2. generateReduxStore(todoDefinition) — output contains 'configureStore'
3. generateReduxStore(todoDefinition) — the addTodo reducer is not a stub (does not contain 'return state' with no logic)
4. generateHooks(todoDefinition) — output contains 'useTodoDispatch', 'useFilteredTodos'
5. generateTypes(todoDefinition) — output contains 'TodoState'

Mirror the same tests for packages/generator-angular/src/generator.test.ts testing
generateNgRxActions, generateNgRxReducer, generateAngularFacade.
```

---

## 🟡 10. Fix `pipe()` method on Observable (missing `.pipe()` on Observable instances)

**File:** `packages/core/src/observable.ts`

**Problem:** The `Observable<T>` interface and `asObservable()` implementation do not include a `.pipe()` method. The tests call `observable$.pipe(map(...))` which only works if Observable has this method.

**Copilot prompt:**

```
In packages/core/src/observable.ts, add a pipe() method to the Observable interface
and to the object returned by asObservable().

The pipe() method should accept 1-4 operator functions (use overloads) and apply them
in sequence, returning the final Observable.

interface Observable<T> {
  subscribe(...): Subscription;
  pipe<A>(op1: (obs: Observable<T>) => Observable<A>): Observable<A>;
  pipe<A, B>(op1: ..., op2: ...): Observable<B>;
  // etc.
}

In the asObservable() implementation, add:
  pipe(...operators) {
    return operators.reduce((obs, op) => op(obs), this);
  }

Check that observable.test.ts test "should chain multiple operators" passes after this change.
```

---

## 🟡 11. Fix `useSelector` subscription signature mismatch

**File:** `packages/react/src/hooks.ts`

**Problem:** `useSelector` subscribes with `store.subscribe(selector, listener)` where `listener` receives the _selected value_ `S`. But `useSyncExternalStore` expects a `() => void` callback (a snapshot invalidation signal), not a value callback. The current code passes the wrong listener type.

**Copilot prompt:**

```
In packages/react/src/hooks.ts, verify useSelector is correctly integrated with useSyncExternalStore.

useSyncExternalStore expects:
  subscribe: (onStoreChange: () => void) => () => void

But store.subscribe(selector, listener) calls listener with the new selected value S, not void.

Fix: wrap the listener to ignore the value:
  (listener) => store.subscribe(selector, () => listener())

Or alternatively: use store.subscribe(fullListener) and let useSyncExternalStore
re-run getSnapshot() when any state change occurs (less efficient but correct).

Add a test in hooks.test.tsx that verifies useSelector does NOT trigger a re-render
when an unrelated part of the state changes.
```

---

## 🟡 12. Add `@polystate/angular` to Angular todo generated example

**File:** `examples/angular-todo-generated/`

**Problem:** The `store.module.ts` imports and registers NgRx correctly, but `app.component.ts` is a stub. The example doesn't demonstrate the full working app.

**Copilot prompt:**

```
Complete examples/angular-todo-generated/src/app/app.component.ts.

It should:
1. Inject TodoFacade in the constructor
2. Expose filteredTodos$ = this.facade.todos$ (or a computed filtered version)
3. Have methods: addTodo(title: string), toggleTodo(id: number), removeTodo(id: number), setFilter(filter: string)
4. Use the async pipe in the template

The template should show:
- An input + Add button
- A list of todos with toggle checkbox and Delete button
- Filter buttons: All / Active / Completed

Import StoreModule and TodoStoreModule in the AppModule or use standalone component pattern (Angular 17+).
```
