# Contributing to Polystate

Thank you for considering contributing to Polystate! We're excited to have you help make this library better.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- macOS, Linux, or Windows with WSL

### Development Setup

```bash
# Clone the repository
git clone https://github.com/polystate/polystate.git
cd polystate

# Install dependencies
npm install

# Verify setup
npm run build
npm run test
npm run lint
```

## Development Workflow

### Project Structure

```
packages/
├── core/               # Framework-agnostic core (start here for base features)
├── react/              # React hooks and integration
├── angular/            # Angular services and integration
└── devtools/           # Redux DevTools Extension support

examples/
├── react-todo/         # Basic React example
├── angular-todo/       # Basic Angular example
├── nextjs-ssr/         # Next.js server-side rendering
├── angular-universal/  # Angular SSR
└── micro-frontends/    # Module Federation example
```

### Making Changes

1. **Create a branch** from `main`:

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** in the appropriate package

3. **Write/update tests** for your changes:

   ```bash
   npm run test -- --watch
   ```

4. **Ensure code quality**:

   ```bash
   npm run lint
   npm run format
   ```

5. **Build to verify**:
   ```bash
   npm run build
   ```

### Commit Messages

We use **conventional commits** for clear, semantic versioning:

```bash
git commit -m "feat(core): add support for middleware composition

- Allows chaining multiple middleware into a pipeline
- Maintains execution order and error handling
- Closes #123"
```

**Types:**

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (no logic)
- `refactor`: Code refactoring (no logic)
- `test`: Adding or updating tests
- `chore`: Build, dependencies, tooling

**Scopes:**

- `core`: @polystate/core
- `react`: @polystate/react
- `angular`: @polystate/angular
- `devtools`: @polystate/devtools
- `examples`: Example applications

### Testing

We use **Vitest** for all testing.

**Unit tests** should be colocated with source files:

```
src/
├── store.ts
└── store.test.ts     # Same location, same name + .test
```

**Test structure:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './store';

describe('Store', () => {
  let store: Store<{ count: number }>;

  beforeEach(() => {
    store = createStore(
      { count: 0 },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
      }
    );
  });

  it('should initialize with provided state', () => {
    expect(store.getState()).toEqual({ count: 0 });
  });

  it('should dispatch actions and update state', () => {
    store.dispatch('increment');
    expect(store.getState()).toEqual({ count: 1 });
  });
});
```

**Run tests:**

```bash
# All tests
npm run test

# Watch mode
npm run test -- --watch

# Specific package
npm run test -- packages/core

# With coverage
npm run test -- --coverage
```

### Code Style

We use **Prettier** and **ESLint**:

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint
```

### TypeScript Standards

- **Strict mode enabled** everywhere
- **No `any` types** (use `unknown` if needed)
- **Full JSDoc** on all public APIs
- **Explicit return types** on functions
- **No implicit object indexing** (`noUncheckedIndexedAccess`)

**Example:**

````typescript
/**
 * Subscribes to store changes with optional selector.
 *
 * @template T - The store state type
 * @template S - The selected value type
 * @param selector - Function to select slice of state (optional)
 * @param listener - Callback invoked on state changes
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = store.subscribe(state => console.log(state));
 * // ... later
 * unsubscribe();
 * ```
 */
export function subscribe<T, S = T>(
  this: Store<T>,
  selector: (state: T) => S,
  listener: (value: S) => void
): () => void;
````

## Adding New Features

### Feature Checklist

- [ ] **Implementation** - Core logic in appropriate package
- [ ] **Tests** - Unit tests with good coverage (aim for 80%+)
- [ ] **Types** - Full TypeScript types with JSDoc
- [ ] **Documentation** - README updates if user-facing
- [ ] **Examples** - If possible, add to relevant example app
- [ ] **Changelog** - Add entry via changeset

### Adding to @polystate/core

For new core features:

1. Create the feature file: `packages/core/src/my-feature.ts`
2. Export from `packages/core/src/index.ts`
3. Add comprehensive tests: `packages/core/src/my-feature.test.ts`
4. Update [packages/core/README.md](./packages/core/README.md)

### Adding to @polystate/react

For React-specific features:

1. Create in `packages/react/src/hooks/` or `packages/react/src/`
2. Add React integration tests using `@testing-library/react`
3. Document in [packages/react/README.md](./packages/react/README.md)
4. Add example in `examples/react-todo/`

### Adding to @polystate/angular

For Angular-specific features:

1. Create in `packages/angular/src/`
2. Add Angular TestBed tests
3. Document in [packages/angular/README.md](./packages/angular/README.md)
4. Add example in `examples/angular-todo/`

## Documenting Changes

### Update Changesets

Use **changesets** to document version bumps:

```bash
npm run changeset
```

This creates a changeset file describing your changes. Include:

- Which packages changed
- Type of change (major/minor/patch)
- Summary of changes

### Update READMEs

- **Root [README.md](./README.md)** - Major features
- **Package READMEs** - API changes, new features
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Process changes

## Pull Request Process

1. **Update** documentation and tests as needed
2. **Ensure** all checks pass:
   ```bash
   npm run lint
   npm run test
   npm run build
   ```
3. **Create pull request** with clear description:

   ```markdown
   ## Description

   Brief summary of changes

   ## Types of Changes

   - [ ] Bug fix
   - [x] New feature
   - [ ] Breaking change
   - [ ] Documentation

   ## Related Issues

   Closes #123

   ## Testing

   How was this tested?

   ## Checklist

   - [x] Tests added/updated
   - [x] Documentation updated
   - [x] Linting passes
   - [x] TypeScript strict mode verified
   ```

4. **Address review feedback** and push updates
5. **Wait for approval** and merge when ready

## Performance Considerations

### Bundle Size Goals

Target bundle sizes (gzipped):

- `@polystate/core`: < 1.5kb
- `@polystate/react`: < 1kb
- `@polystate/angular`: < 1kb

**Monitor with:**

```bash
npm run build -- --analyze
```

### Optimization Tips

- Avoid adding dependencies to `@polystate/core`
- Use tree-shakeable exports
- Minimize generated code
- Lazy-load when possible
- Profile before optimizing

## Reporting Issues

### Bug Reports

Include:

- Minimal reproduction example
- Expected vs actual behavior
- Environment (Node version, OS, etc.)
- Error message and stack trace
- Polystate version

### Feature Requests

Describe:

- Use case and motivation
- Proposed API
- Examples of usage
- Any concerns or edge cases

## Asking Questions

- **GitHub Discussions** for questions and ideas
- **GitHub Issues** for bugs and feature requests
- **Pull Requests** for direct contributions

## Release Process

Releases happen automatically via GitHub Actions when merging to `main`:

1. Changesets are processed
2. Versions are bumped (semantic versioning)
3. CHANGELOG is updated
4. Packages are published to npm
5. Release notes are created on GitHub

### Manual Release (if needed)

```bash
# Create versions from changesets
npm run version

# Publish to npm
npm run publish
```

## Code of Conduct

- **Be respectful** and inclusive
- **Give credit** where due
- **Assume good intentions**
- **Focus on code**, not people
- **Help others** learn and grow

## Recognition

Contributors are recognized in:

- Release notes
- README contributors section
- Monthly community highlights

## Questions?

- **Issues**: [GitHub Issues](https://github.com/polystate/polystate/issues)
- **Discussions**: [GitHub Discussions](https://github.com/polystate/polystate/discussions)
- **Email**: team@polystate.dev

Thank you for contributing to Polystate! 🎉
