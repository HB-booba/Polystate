# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of Polystate monorepo
- `@polystate/core` - Framework-agnostic state management core
  - `Signal<T>` reactive primitive
  - `Store<T>` class for state management
  - `createStore()` factory function
  - `createSlice()` for Redux Toolkit-style slices
  - Middleware system (logger, thunk, persist, devtools)
  - RxJS compatible `asObservable()` bridge
  - Full TypeScript strict mode support
  - Zero dependencies

- `@polystate/react` - React 18+ integration
  - `useStore()` hook for full state subscription
  - `useSelector()` hook for selective subscriptions
  - `useDispatch()` hook for action dispatching
  - `useSetState()` hook for state updates
  - `createStoreHooks()` factory for pre-bound hooks
  - `createStoreContext()` for context-based stores
  - Built on `useSyncExternalStore` for perfect React sync

- `@polystate/angular` - Angular 17+ integration
  - `PolystateService` abstract base class
  - `.select()` method returning Angular Signals
  - `.select$()` method returning RxJS Observables
  - `createAngularService()` factory function
  - Full Angular DI compatibility

- `@polystate/devtools` - Redux DevTools Extension bridge
  - `createDevToolsMiddleware()` for Redux DevTools integration
  - Time-travel debugging support
  - Action inspection and history
  - State snapshots and import/export
  - Configurable action history size

- Examples
  - React Todo App - Demonstrating React hooks usage
  - Angular Todo App - Demonstrating Angular services
  - Next.js SSR - Server-side rendering example
  - Angular Universal - Angular SSR example
  - Micro-Frontends - Module Federation with shared state

- Documentation
  - Comprehensive README with architecture diagram
  - Package-specific READMEs for each package
  - API documentation with examples
  - CONTRIBUTING.md with development guidelines
  - GitHub Actions CI/CD workflow

- Configuration
  - Nx monorepo setup
  - TypeScript strict mode throughout
  - Vitest for testing
  - ESLint for code style
  - Prettier for formatting
  - tsup for bundling (ESM + CJS)

### Features

- Framework-agnostic core: works with React, Angular, Vue, or vanilla JS
- Lightweight bundles: core < 1.5kb, adapters < 1kb (gzipped)
- Full type safety: TypeScript strict mode, complete JSDoc
- Selective subscriptions: components re-render only when subscribed values change
- Async actions: built-in thunk middleware support
- Persistence: auto-save/load state with customizable storage
- RxJS integration: seamless observable compatibility
- DevTools integration: time-travel debugging with Redux DevTools
- Multiple middleware support: compose logger, persist, devtools, and custom
- SSR ready: works with Next.js and Angular Universal

## [0.1.0] - 2024-01-01

### Released

- Initial alpha release with all core packages

---

## Legend

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** in case of vulnerabilities

## Contributing

To report changes in a pull request, use the following format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- Feature description

### Changed

- Change description

### Fixed

- Bug fix description
```

For more information, see [CONTRIBUTING.md](./CONTRIBUTING.md#changelog).
