# @polystate/generator-angular

Angular NgRx code generator for Polystate store definitions.

Generates production-ready NgRx stores, actions, reducers, selectors, effects, and facade services from framework-agnostic store definitions.

## Installation

```bash
npm install --save-dev @polystate/generator-angular @polystate/definition
```

## Usage

```typescript
import {
  generateNgRxActions,
  generateNgRxReducer,
  generateNgRxSelectors,
  generateNgRxState,
  generateAngularFacade,
  generateStoreModule,
} from '@polystate/generator-angular';
import { todoDefinition } from './store.definition';

// Generate store code
const actionsCode = generateNgRxActions(todoDefinition);
const reducerCode = generateNgRxReducer(todoDefinition);
const selectorsCode = generateNgRxSelectors(todoDefinition);
const stateCode = generateNgRxState(todoDefinition);
const facadeCode = generateAngularFacade(todoDefinition);
const moduleCode = generateStoreModule(todoDefinition);

// Write to files
fs.writeFileSync('store/actions.ts', actionsCode);
fs.writeFileSync('store/reducer.ts', reducerCode);
fs.writeFileSync('store/selectors.ts', selectorsCode);
fs.writeFileSync('store/state.ts', stateCode);
fs.writeFileSync('store/facade.ts', facadeCode);
fs.writeFileSync('store/store.module.ts', moduleCode);
```

## Generated Code

The generator automatically creates:

### `state.ts`

- TypeScript interface for store state

### `actions.ts`

- Strongly typed NgRx actions with payload support

### `reducer.ts`

- NgRx reducer function with handlers for all actions

### `selectors.ts`

- Memoized selectors for all state properties
- Feature selector for store slice

### `facade.ts` (Angular Service)

- Injectable service that wraps the store
- Observables for each state property
- Methods for dispatching actions
- Simplified API for components

### `store.module.ts`

- Angular module for registering store feature

## Features

- ✅ Fully typed NgRx store
- ✅ Memoized selectors
- ✅ Strongly typed actions
- ✅ Facade service for easy component integration
- ✅ Angular 17+ compatible
- ✅ RxJS Observables for reactive components

## Usage in Components

### With Facade

```typescript
@Component({...})
export class TodoComponent {
  todos$ = this.facade.todos$;

  constructor(public facade: TodoFacade) {}

  addTodo(title: string) {
    this.facade.addTodo(title);
  }
}
```

### With Direct Store Selection

```typescript
@Component({...})
export class TodoComponent {
  todos$ = this.store.pipe(select(selectTodos));

  constructor(private store: Store) {}
}
```

## License

MIT
