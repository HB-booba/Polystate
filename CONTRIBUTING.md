# Contributing to Polystate

Thank you for considering contributing to Polystate! We're excited to have you help make this library better.

## Getting Started

## Prerequisites

- Node.js 18+
- pnpm (package manager)
- macOS, Linux, or Windows with WSL
- Git knowledge

### Installation

```bash
# Clone the repository
git clone https://github.com/HB-booba/Polystate.git
cd polystate

# Install dependencies with pnpm
pnpm install

# Verify setup
pnpm build
pnpm test
pnpm lint
```

## Before You Start

### 🚨 Important: PRs Only

- **No direct pushes to `master`** — all changes require a pull request
- **No direct pushes to `develop`** — all changes require a pull request
- Create a feature branch from `develop` for your work
- All CI checks must pass before your PR can be merged
- At least one maintainer review is required

### Issue-First Policy

**Before starting significant work:**

1. **Check existing issues** — your feature/fix may already exist
2. **Open an issue first** for:
   - Major features
   - Breaking changes
   - Architectural decisions
   - Anything adding 100+ lines of code
3. **Wait for initial feedback** — discuss approach with maintainers
4. **Get approval** before implementing large changes

This helps avoid wasted effort and ensures alignment with project goals.

## Development Workflow

### Feature Branch Naming

Use descriptive branch names:

```
feature/my-feature-name       # New feature
fix/bug-description           # Bug fix
docs/update-readme            # Documentation
chore/upgrade-deps            # Maintenance
```

### Making Your Changes

1. **Sync from `develop` and create your feature branch**:

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature
   ```

2. **Keep scope focused** — one feature or fix per PR (no mixing concerns)

3. **Make your changes** in the appropriate package

4. **Write/update tests** for your changes:

   ```bash
   pnpm test -- --watch
   ```

5. **Ensure code quality**:

   ```bash
   pnpm lint
   pnpm format
   ```

6. **Build to verify everything works**:
   ```bash
   pnpm build
   ```

### Conventional Commits (Enforced)

**Every commit message MUST follow conventional commit format.** This is validated by commitlint on all PRs.

**Format:**
```
type(scope): subject

body (optional)

footer (optional)
```

**Types** (required):
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (no logic)
- `refactor`: Code refactoring (no logic)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build, dependencies, tooling

**Scopes** (optional but recommended):
- `core`: @polystate/core
- `react`: @polystate/react
- `angular`: @polystate/angular
- `devtools`: @polystate/devtools
- `cli`: @polystate/cli
- `definition`: @polystate/definition
- `examples`: Example applications

**Examples:**

```bash
# Good - clear, concise, conventional
git commit -m "feat(core): add middleware composition support

- Allows chaining multiple middleware into a pipeline
- Maintains execution order and error handling

Closes #123"

git commit -m "fix(react): prevent unnecessary re-renders with useSyncExternalStore"

git commit -m "docs: update README with new examples"

git commit -m "chore(deps): upgrade typescript to 5.4"
```

**❌ Bad commits:**
```
git commit -m "fixed stuff"
git commit -m "Updated code"
git commit -m "WIP"
git commit -m "asdfgh"
```

### One Feature/Fix Per PR

- **Do not mix concerns** — one PR = one fix or feature
- **Separate bug fixes from refactoring** — different PRs
- **Separate docs changes from code** — different PRs
- This makes code review faster and history cleaner

## Development Setup

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
pnpm test

# Watch mode
pnpm test -- --watch

# Specific package
pnpm test -- packages/core

# With coverage
pnpm test -- --coverage
```

### Code Style

We use **Prettier** and **ESLint**:

```bash
# Format code
pnpm format

# Check formatting
pnpm format:check

# Lint code
pnpm lint
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

### Before Submitting a PR

Ensure your code is ready:

```bash
# 1. Run all checks locally before submitting
pnpm lint       # Check code style
pnpm format     # Auto-format code
pnpm test       # Run all tests
pnpm build      # Verify build succeeds

# 2. Verify git log has conventional commits
git log --oneline develop..HEAD
```

### PR Requirements (Enforced)

✅ **Your PR must:**

- [ ] Follow **conventional commit** format (validated by commitlint)
- [ ] Target the **`develop` branch** (not `master`)
- [ ] Contain **one logical feature or fix** (no mixed concerns)
- [ ] Have **clear description** of changes (use PR template)
- [ ] Include **tests** for new functionality
- [ ] Have **no edits to generated files** (except in `examples/*-generated/`)
- [ ] Pass **all CI checks**:
  - Commitlint ✅
  - Lint (ESLint)
  - Tests (Vitest)
  - Build (tsup)
  - TypeScript strict mode

### Creating a Pull Request

1. **Use the PR template** (auto-filled when you create a PR)
2. **Fill in all sections**:
   - Description of what changed and why
   - Type of change (feat, fix, docs, chore)
   - Related issues
3. **Check off the checklist** to confirm:
   - Tests pass
   - Conventional commit message
   - No generated file edits
4. **Wait for CI to pass** — you can't merge until all checks are green
5. **Request a review** from maintainers
6. **Address feedback** and push updates
7. **Merge when approved** — done by maintainers

### Merge Requirements

A PR can be merged only when:

- ✅ Conventional commits validated
- ✅ All CI checks pass (lint, test, build)
- ✅ At least one maintainer approval
- ✅ No requested changes
- ✅ Branch is up to date with `develop`

### Branch Policy

- **No direct pushes** to `master` or `develop`
- **Contributors** must branch from `develop`
- **Pull requests** must target `develop`
- **`master`** is updated only by maintainers during releases

## CI/Validation Checks

All pull requests are automatically validated:

### Commitlint

- Validates each commit follows **conventional commit format**
- Run locally: `pnpm commitlint -- --from develop`
- **Failing this = PR can't be merged**

### ESLint

- Checks code style and quality
- Run locally: `pnpm lint`

### Vitest

- Runs all unit tests
- Run locally: `pnpm test`

### Build

- Verifies all packages build successfully (tsup)
- Run locally: `pnpm build`

### TypeScript

- Strict mode validation across all packages
- Run locally: `npx tsc --noEmit`

## Reporting Issues

### Submitting Bug Reports

Use the **bug report template** (auto-filled when creating an issue):

Include:

- ✅ Minimal reproduction example
- ✅ Expected vs actual behavior
- ✅ Environment (Node version, OS, pnpm version)
- ✅ Error message and full stack trace
- ✅ Polystate version(s) affected

**Don't:**
- ❌ Report security issues publicly — email maintainers instead
- ❌ Use issues for support questions — use Discussions

### Submitting Feature Requests

Use the **feature request template**:

Describe:

- ✅ Use case and motivation
- ✅ Proposed API / approach
- ✅ Example usage code
- ✅ Any known alternatives or concerns

## Getting Help

- **Questions?** Use [GitHub Discussions](https://github.com/HB-booba/Polystate/discussions)
- **Bug or feature?** Use [GitHub Issues](https://github.com/HB-booba/Polystate/issues)
- **Want to contribute?** See this guide and submit a PR

## Performance Considerations

### Bundle Size Goals

Target bundle sizes (gzipped):

- `@polystate/core`: < 1.5kb
- `@polystate/react`: < 1kb
- `@polystate/angular`: < 1kb

**Monitor with:**

```bash
pnpm build
```

### Optimization Tips

- Avoid adding dependencies to `@polystate/core`
- Use tree-shakeable exports
- Minimize generated code
- Lazy-load when possible
- Profile before optimizing

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
