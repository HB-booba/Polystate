# Polystate Examples

This directory contains example applications demonstrating Polystate in different environments.

## Quick Start

Each example is a complete, working project. To run an example:

```bash
cd examples/[example-name]
npm install
npm run dev
```

## Examples

### React Todo

A simple todo application built with React and Polystate.

**Features:**

- Basic todo CRUD operations
- Filtering (all, active, completed)
- Local state management with Polystate
- Uses `useSelector` and `useDispatch` hooks

**Run:**

```bash
cd examples/react-todo
npm install
npm run dev
# Open http://localhost:5173
```

**Key Files:**

- `src/App.tsx` - Main component with store and hooks
- Shows how to use `useSelector`, `useDispatch`, `createStoreHooks`

### Angular Todo

A todo application built with Angular 17+ and Polystate.

**Features:**

- Todo management with signals and observables
- Filtering and state management
- Angular Services with Polystate
- Uses both Signal and Observable patterns

**Run:**

```bash
cd examples/angular-todo
npm install
npm run dev
# Open http://localhost:4200
```

**Key Files:**

- `src/app/todo.service.ts` - Service extending PolystateService
- `src/app/todos.component.ts` - Component using signals and observables
- Shows `select()`, `select$()`, and computed signals

### Next.js SSR

Server-side rendering example with Polystate and Next.js.

**Features:**

- Hydration support for state
- SSR with getServerSideProps
- Initial state bootstrapping
- Works with both server and client

**Run:**

```bash
cd examples/nextjs-ssr
npm install
npm run dev
# Open http://localhost:3000
```

**Key Files:**

- `pages/_app.tsx` - App wrapper with store context
- `pages/index.tsx` - Server-side state initialization
- Shows SSR-compatible state setup

### Angular Universal

Angular Universal (SSR) example with Polystate.

**Features:**

- Server-side rendering with Angular
- Hydration from server to client
- Transient vs platform-specific services
- Full SSR support

**Run:**

```bash
cd examples/angular-universal
npm install
npm run dev
# Open http://localhost:4200
```

**Key Files:**

- `server.ts` - Express server for SSR
- `app/app.server.module.ts` - Server-specific module
- Shows server-side state initialization

### Micro-Frontends

Module Federation example with Polystate shared across React and Angular MFEs.

**Features:**

- Webpack Module Federation setup
- Store shared between React and Angular
- Two micro-frontends (React and Angular) using same store
- Container application orchestrating MFEs

**Structure:**

```
micro-frontends/
├── container/          # Container app that loads MFEs
├── react-app/          # React micro-frontend
└── angular-app/        # Angular micro-frontend
```

**Run:**

```bash
# Run all MFEs in parallel
cd examples/micro-frontends
npm run dev

# Or individually:
cd container && npm run dev      # Port 3000
cd react-app && npm run dev      # Port 3001  (referenced by container)
cd angular-app && npm run dev    # Port 3002  (referenced by container)

# Open http://localhost:3000
```

**Key Features:**

- Shared Polystate store across MFEs
- Both React and Angular loading same store instance
- Module Federation webpack config

## Learning Path

We recommend exploring examples in this order:

1. **React Todo** - Learn basic Polystate concepts and React hooks
2. **Angular Todo** - Learn Angular patterns with Signals and Observables
3. **Next.js SSR** - Understand server-side rendering
4. **Angular Universal** - Learn SSR in Angular
5. **Micro-Frontends** - Advanced: Multi-framework apps with shared state

## Common Tasks

### Running Tests

Each example may have tests:

```bash
cd examples/react-todo
npm run test
```

### Building for Production

```bash
cd examples/react-todo
npm run build
```

### Inspecting Store with Redux DevTools

Some examples include Redux DevTools middleware. Open Redux DevTools (browser extension) to:

- Inspect all actions
- View state changes
- Time-travel through history

## Troubleshooting

### Port Already in Use

Change the port in the dev script:

- React/Next: Vite uses `VITE_PORT` env var
- Angular: Use `--port` flag: `ng serve --port 4201`

### Module Not Found

Make sure dependencies are installed:

```bash
npm install
```

### Build Errors

Check that you're using the right Node.js version (18+):

```bash
node --version
```

## Creating Your Own Example

To create a new example:

1. Create folder in `examples/[name]`
2. Add `package.json` with dependencies
3. Set up build config (vite.config.ts, ng-serv, etc.)
4. Implement with Polystate
5. Add README.md explaining the example
6. Add to this README's Examples section

Example minimal `package.json`:

```json
{
  "name": "polystate-example-my-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@polystate/core": "workspace:*",
    "@polystate/react": "workspace:*"
  }
}
```

## Contributing Examples

Have an interesting use case? We'd love to see it!

1. Create a pull request with your example
2. Include comprehensive README
3. Keep it simple and focused
4. Document key concepts

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## Resources

- **[Polystate Documentation](../README.md)**
- **[@polystate/core API](../packages/core/README.md)**
- **[@polystate/react API](../packages/react/README.md)**
- **[@polystate/angular API](../packages/angular/README.md)**
- **[CONTRIBUTING.md](../CONTRIBUTING.md)**

## License

All examples are MIT licensed. Feel free to use as templates for your projects.
