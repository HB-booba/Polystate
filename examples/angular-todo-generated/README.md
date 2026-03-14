# Angular Todo - Polystate Generated NgRx

A complete Angular + NgRx todo application using **Polystate code generation**.

This example demonstrates how to:

- Define a framework-agnostic store in `store.definition.ts`
- Generate a production-ready NgRx store with the Polystate CLI
- Use generated services and selectors in Angular components

## 🚀 Quick Start

### 1. Generate Code

The store code is already generated in `src/app/store/`, but you can regenerate it:

```bash
npm run generate
```

This runs:

```bash
polystate generate store.definition.ts --overwrite
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:4200 in your browser.

## 📁 Project Structure

```
src/app/
├── store/
│   ├── state.ts         # Generated state interface
│   ├── actions.ts       # Generated NgRx actions
│   ├── reducer.ts       # Generated reducer
│   ├── selectors.ts     # Generated memoized selectors
│   ├── facade.ts        # Generated service facade
│   ├── store.module.ts  # Generated store module
│   └── index.ts         # Public API
├── app.component.ts     # Main todo component
└── app.component.css    # Styles

store.definition.ts       # Framework-agnostic store definition
```

## 📝 Generated Files

The `npm run generate` command creates:

### `store/state.ts`

- TypeScript interface for store state

### `store/actions.ts`

- Strongly typed NgRx actions
- Actions: addTodo, toggleTodo, removeTodo, setFilter

### `store/reducer.ts`

- NgRx reducer function
- Handles all action mutations

### `store/selectors.ts`

- Memoized selectors using createSelector
- Available selectors:
  - `selectTodos` - All todos
  - `selectFilter` - Current filter
  - `selectFilteredTodos` - Filtered todos
  - `selectActiveTodoCount` - Active todo count
  - `selectCompletedTodoCount` - Completed todo count

### `store/facade.ts` (Angular Service)

- `TodoFacade` service with convenience methods:
  - `todos$` Observable
  - `filter$` Observable
  - `filteredTodos$` Observable
  - `activeTodoCount$` Observable
  - `completedTodoCount$` Observable
  - `addTodo(title)` method
  - `toggleTodo(id)` method
  - `removeTodo(id)` method
  - `setFilter(filter)` method

### `store/store.module.ts`

- Angular module that registers the store feature slice

## 🎯 Key Features

✅ **Code Generation** - NgRx store automatically generated from definition
✅ **Facade Service** - Simple service API hiding NgRx complexity
✅ **Memoized Selectors** - Using @ngrx/store createSelector for performance
✅ **Full TypeScript** - Complete type inference and safety
✅ **Reactive Observables** - RxJS Observable streams for async templates
✅ **Zero Manual NgRx Setup** - No action/reducer boilerplate needed

## 🔄 Regenerating Code

When you modify `store.definition.ts`, regenerate with:

```bash
npm run generate
```

This updates all generated files in `src/app/store/` without affecting your components.

## 📦 Build for Production

```bash
npm run build
```

Optimized build will be in `dist/`.

## 📚 Learn More

- [Polystate Definition](../../packages/definition/README.md)
- [Generator Angular](../../packages/generator-angular/README.md)
- [Polystate CLI](../../packages/cli/README.md)
- [NgRx Documentation](https://ngrx.io)
