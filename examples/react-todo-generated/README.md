# React Todo - Polystate Generated Redux

A complete React + Redux todo application using **Polystate code generation**.

This example demonstrates how to:

- Define a framework-agnostic store in `store.definition.ts`
- Generate a production-ready Redux store with the Polystate CLI
- Use generated hooks and selectors in React components

## 🚀 Quick Start

### 1. Generate Code

The store code is already generated in `src/store/`, but you can regenerate it:

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

Open http://localhost:3000 in your browser.

## 📁 Project Structure

```
src/
├── store/
│   ├── store.ts       # Generated Redux store + actions + middleware
│   ├── hooks.ts       # Generated React hooks
│   └── types.ts       # Generated TypeScript types
├── App.tsx            # Main todo component
├── App.css            # Styles
├── main.tsx           # React entry point
└── index.css          # Global styles

store.definition.ts    # Framework-agnostic store definition
```

## 📝 Generated Files

The `npm run generate` command creates:

### `store/store.ts`

- Redux store configuration
- Actions (addTodo, toggleTodo, removeTodo, setFilter)
- Memoized selectors (reselect)
- Middleware:
  - **Logger**: Logs all actions to console
  - **Persist**: Auto-saves todos to localStorage

### `store/hooks.ts`

Convenient hooks for components:

- `useTodoDispatch()` - All actions in one hook
- `useFilteredTodos()` - Filtered todos
- `useTodos()` - All todos
- `useFilter()` - Current filter
- `useActiveTodoCount()` - Number of incomplete todos
- `useCompletedTodoCount()` - Number of completed todos

### `store/types.ts`

- `TodoState` interface

## 🎯 Key Features

✅ **Code Generation** - Redux store automatically generated from definition
✅ **Built-in Middleware** - Logging and persistence included
✅ **Memoized Selectors** - Using reselect for performance
✅ **Full TypeScript** - Complete type inference
✅ **Redux DevTools** - Time-travel debugging support
✅ **Zero Manual Redux Setup** - No reducer boilerplate needed

## 🔄 Regenerating Code

When you modify `store.definition.ts`, regenerate with:

```bash
npm run generate
```

This updates all generated files in `src/store/` without affecting your components.

## 📦 Build for Production

```bash
npm run build
```

Generated files and app will be optimized in `dist/`.

## 📚 Learn More

- [Polystate Definition](../../packages/definition/README.md)
- [Generator React](../../packages/generator-react/README.md)
- [Polystate CLI](../../packages/cli/README.md)
