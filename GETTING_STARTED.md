# Getting Started

This guide will help you set up the Polystate monorepo and get started developing.

## Prerequisites

- **Node.js** 18+ (for development)
- **npm** 9+ or **pnpm** 8+
- Git

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/polystate/polystate.git
cd polystate
```

### 2. Install Dependencies

```bash
npm install
```

This will install:

- Root dependencies (Nx, TypeScript, ESLint, Prettier, etc.)
- All package and example dependencies

### 3. Verify Installation

```bash
npm run build
npm run test
npm run lint
```

Great! You should see:

- All packages building successfully
- All tests passing
- No linting errors

## Development

### Building

Build all packages:

```bash
npm run build
```

Build a specific package:

```bash
npm run build -- @polystate/core
npm run build -- @polystate/react
npm run build -- @polystate/angular
npm run build -- @polystate/devtools
```

Watch mode:

```bash
npm run dev
```

### Testing

Run all tests:

```bash
npm run test
```

Watch mode:

```bash
npm run test -- --watch
```

With coverage:

```bash
npm run test -- --coverage
```

Test a specific package:

```bash
npm run test -- packages/core
```

### Linting and Formatting

Lint all code:

```bash
npm run lint
```

Fix linting issues:

```bash
npm run lint -- --fix
```

Format code:

```bash
npm run format
```

Check formatting without changes:

```bash
npm run format:check
```

## Project Structure

### Packages

```
packages/
├── core/               # Framework-agnostic core (main package)
│   ├── src/
│   │   ├── signal.ts    # Reactive Signal primitive
│   │   ├── store.ts     # Store class and createStore
│   │   ├── slice.ts     # Slice support (Redux Toolkit style)
│   │   ├── middleware.ts # Middleware system
│   │   ├── observable.ts # RxJS compatibility
│   │   └── index.ts     # Public exports
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── react/              # React 18+ adapter
│   ├── src/
│   │   ├── hooks.ts     # React hooks (useStore, useSelector, etc.)
│   │   ├── context.ts   # Context provider
│   │   └── index.ts
│   └── README.md
│
├── angular/            # Angular 17+ adapter
│   ├── src/
│   │   ├── service.ts   # PolystateService and factory
│   │   └── index.ts
│   └── README.md
│
└── devtools/           # Redux DevTools middleware
    ├── src/
    │   ├── middleware.ts # DevTools integration
    │   └── index.ts
    └── README.md

examples/
├── react-todo/         # React example app
├── angular-todo/       # Angular example app
├── nextjs-ssr/         # Next.js SSR example
├── angular-universal/  # Angular Universal example
└── micro-frontends/    # Module Federation example
```

### Configuration Files

**Root Level:**

- `package.json` - Root dependencies and scripts
- `nx.json` - Nx monorepo configuration
- `tsconfig.json` - Root TypeScript config
- `.eslintrc.json` - ESLint configuration
- `.prettierrc.json` - Prettier configuration
- `vitest.config.ts` - Vitest configuration
- `.npmrc` - npm configuration
- `.gitignore` - Git ignore rules

**Each Package:**

- `package.json` - Package metadata and dependencies
- `tsconfig.json` - Package-specific TypeScript config

## Package Details

### @polystate/core

The framework-agnostic core package.

**Key Exports:**

- `Signal<T>` - Reactive primitive
- `Store<T>` - Store class
- `createStore()` - Store factory
- `createSlice()` - Slice factory
- Middleware functions: logger, persist, devTools, thunk
- `asObservable()` - RxJS compatibility

**Try it:**

```bash
cd packages/core
npm run build
npm run test
```

### @polystate/react

React 18+ hooks for Polystate.

**Key Exports:**

- `useStore()` - Subscribe to entire state
- `useSelector()` - Subscribe to state slice
- `useDispatch()` - Get dispatch function
- `useSetState()` - Set state without actions
- `createStoreHooks()` - Pre-bind hooks
- `createStoreContext()` - Context provider

**Try it:**

```bash
cd examples/react-todo
npm install
npm run dev
```

### @polystate/angular

Angular 17+ services for Polystate.

**Key Exports:**

- `PolystateService` - Base service class
- `createAngularService()` - Service factory

**Key Methods:**

- `.select()` - Returns Angular Signal
- `.select$()` - Returns RxJS Observable
- `.dispatch()` - Dispatch actions
- `.getState()` - Get state snapshot

**Try it:**

```bash
cd examples/angular-todo
npm install
npm run dev
```

### @polystate/devtools

Redux DevTools Extension integration.

**Key Exports:**

- `createDevToolsMiddleware()` - DevTools middleware
- `connectDevTools()` - Connect existing store
- `exportStateHistory()` - Export history
- `importStateHistory()` - Import history

## Running Examples

### React Todo

```bash
cd examples/react-todo
npm install
npm run dev
# Open http://localhost:5173
```

### Angular Todo

```bash
cd examples/angular-todo
npm install
npm run dev
# Open http://localhost:4200
```

## Making Changes

### Adding a Feature

1. **Choose the package** where it belongs
   - Framework-agnostic code → `@polystate/core`
   - React-specific code → `@polystate/react`
   - Angular-specific code → `@polystate/angular`

2. **Create/modify files** in `packages/[name]/src/`

3. **Write tests** alongside your code (`.test.ts` or `.test.tsx`)

4. **Update exports** in `src/index.ts`

5. **Add JSDoc comments** to all public APIs

6. **Build and test**:
   ```bash
   npm run build
   npm run test
   ```

### Testing Your Changes

```bash
# Test a specific file
npm run test -- packages/core/src/store.test.ts

# Watch mode
npm run test -- --watch

# With coverage
npm run test -- --coverage
```

### Committing Changes

Use conventional commit format:

```bash
git commit -m "feat(core): add support for async reducers"
git commit -m "fix(react): fix useSelector memory leak"
git commit -m "docs: update README with examples"
```

## Type Checking

Ensure TypeScript works correctly:

```bash
npm run type-check
```

This runs TypeScript in `--noEmit` mode across all packages.

## Bundle Size Analysis

Check bundle sizes:

```bash
npm run build

# Then check the dist folders:
ls -lh packages/core/dist/
ls -lh packages/react/dist/
ls -lh packages/angular/dist/
```

**Current targets:**

- @polystate/core: < 1.5kb (gzipped)
- @polystate/react: < 1kb (gzipped)
- @polystate/angular: < 1kb (gzipped)

## Debugging

### VS Code Debugging

1. Install [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome)

2. Add to `.vscode/launch.json`:

   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "chrome",
         "request": "launch",
         "name": "Launch Chrome",
         "url": "http://localhost:5173",
         "webRoot": "${workspaceFolder}/examples/react-todo"
       }
     ]
   }
   ```

3. Start dev server and press F5

### Redux DevTools

Install [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools-extension) for Chrome/Firefox.

Some examples include devtools middleware:

```typescript
import { createDevToolsMiddleware } from '@polystate/devtools';
```

Open DevTools to inspect state and actions.

## Common Issues

### "Module not found"

Ensure all dependencies are installed:

```bash
npm install
```

### Build fails with TypeScript errors

Run type checking:

```bash
npm run type-check
```

Fix errors shown and try again.

### Tests fail

Check Node.js version (need 18+):

```bash
node --version
```

Clear node_modules and reinstall:

```bash
rm -rf node_modules
npm install
npm run test
```

### Port already in use

- React examples (Vite): Automatically tries next port
- Angular: Use `--port` flag: `ng serve --port 4201`

## Next Steps

1. **Read** [packages/core/README.md](packages/core/README.md) - Learn the core API
2. **Explore** [examples/](examples/) - See real-world usage
3. **Try** [Creating a new feature](CONTRIBUTING.md) - Get involved!
4. **Review** [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines

## Getting Help

- **Documentation**: See package READMEs
- **Examples**: Browse [examples/](examples/) folder
- **Issues**: Check [GitHub Issues](https://github.com/polystate/polystate/issues)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)

## Development Commands Quick Reference

```bash
# Install
npm install

# Development
npm run dev                    # Watch mode for all packages
npm run build                  # Build all packages
npm run test                   # Run tests
npm run test -- --watch       # Watch mode
npm run test -- --coverage    # With coverage
npm run lint                   # Lint all code
npm run lint -- --fix         # Fix linting issues
npm run format                # Format code
npm run type-check            # Check types

# Examples
cd examples/react-todo && npm run dev
cd examples/angular-todo && npm run dev

# Specific package
npm run build -- @polystate/core
npm run test -- packages/core
npm run lint -- packages/react
```

Happy coding! 🚀
