# Polystate — Engineering Roadmap
> Complete instructions for GitHub Copilot. Execute phases in order. Do not skip ahead.

---

## Context

Polystate is a state management monorepo. The goal is simple: **a developer writes one TypeScript definition file and gets production-ready Redux code for React AND NgRx code for Angular — both fully typed, both native, zero runtime wrappers.**

Current test status:
- 90/90 unit tests passing
- 22/22 `@polystate/core` integration tests passing
- 18/18 `@polystate/angular` integration tests passing
- 0/11 `@polystate/react` integration tests — dual React instance bug in dist/
- Generator works but uses `handler.toString()` + regex — breaks on complex TypeScript types

---

## Phase 1 — Fix Existing Bugs (Do This First)

### 1A — Fix dual React instance in `@polystate/react`

**Problem:** All 11 React integration tests fail with `Cannot read properties of null (reading 'useSyncExternalStore')`.

**Root cause:** tsup bundles React inside `packages/react/dist/`. The test environment has a separate React from `node_modules`. Two React instances = hooks see null internals.

**Fix:** Create `packages/react/tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  sourcemap: true,
  clean: true,
});
```

Create `packages/angular/tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  external: ['@angular/core', 'rxjs', 'rxjs/operators', '@polystate/core'],
  sourcemap: true,
  clean: true,
});
```

Create `packages/core/tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  sourcemap: true,
  clean: true,
});
```

Create `packages/definition/tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  sourcemap: true,
  clean: true,
});
```

Create `packages/devtools/tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  external: ['@polystate/core'],
  sourcemap: true,
  clean: true,
});
```

### 1B — Fix build pipeline

Add to `root package.json` scripts:

```json
{
  "scripts": {
    "build": "npm run build:core && npm run build:definition && npm run build:react && npm run build:angular && npm run build:devtools",
    "build:core": "tsup --config packages/core/tsup.config.ts",
    "build:react": "tsup --config packages/react/tsup.config.ts",
    "build:angular": "tsup --config packages/angular/tsup.config.ts",
    "build:definition": "tsup --config packages/definition/tsup.config.ts",
    "build:devtools": "tsup --config packages/devtools/tsup.config.ts",
    "pretest:integration": "npm run build"
  }
}
```

### Verify Phase 1

```bash
npm run build
npx vitest run                                              # must show 90/90
npx vitest run --config vitest.integration.config.ts       # must show 51/51
```

**Do not proceed to Phase 2 until both pass.**

---

## Phase 2 — AST Migration (The Key Upgrade)

**Why this matters:**

Today the generators call `handler.toString()` on runtime function values and parse the result with regex. This loses all TypeScript type information.

- Today: `addTodo` generates `PayloadAction<any>` — type is lost
- After: `addTodo` generates `PayloadAction<string>` — exact type preserved
- Today: `filter: 'all' as 'all' | 'active' | 'completed'` becomes `filter: string` in generated interfaces
- After: union type is preserved exactly as written
- Today: complex handler patterns silently fall back to wrong code
- After: any valid TypeScript handler produces correct output — always

The fix: use `ts-morph` to read the TypeScript AST directly from the `.definition.ts` source file.

### 2.1 — Install ts-morph

```bash
npm install --save-dev ts-morph@^23.0.0
```

### 2.2 — Create AST parser

Create `packages/definition/src/ast-parser.ts`:

```
Create packages/definition/src/ast-parser.ts using ts-morph.

Export these TypeScript types:

  export interface ActionParamAST {
    name: string;   // e.g. "title"
    type: string;   // e.g. "string", "number", "'all' | 'active' | 'completed'"
  }

  export interface ActionAST {
    name: string;                      // e.g. "addTodo"
    stateParam: string;                // first param name, e.g. "s" or "state"
    payloadParam: ActionParamAST | null;  // null if no payload
    bodySource: string;                // exact TS source after =>, e.g.
                                       // "({ ...state, todos: [...state.todos, ...] })"
    returnTypeSource: string;
  }

  export interface StoreAST {
    name: string;
    stateTypeName: string;
    stateTypeSource: string;
    initialStateSource: string;
    actions: ActionAST[];
  }

Export this function:
  export function parseDefinitionFile(filePath: string): StoreAST

Export this helper:
  export function findTsConfig(startPath: string): string
    // Walk up from startPath directory until tsconfig.json is found
    // Throw if not found

Implementation rules — CRITICAL:
- Use ts-morph Project to read the source file
- NEVER import or execute the definition file — read AST nodes only
- ALL text must come from node.getText() — never .toString() on runtime values

Key ts-morph patterns:

  import { Project, SyntaxKind } from 'ts-morph';
  import * as path from 'path';
  import * as fs from 'fs';

  function findTsConfig(startPath: string): string {
    let dir = fs.statSync(startPath).isDirectory() ? startPath : path.dirname(startPath);
    while (dir !== path.dirname(dir)) {
      const candidate = path.join(dir, 'tsconfig.json');
      if (fs.existsSync(candidate)) return candidate;
      dir = path.dirname(dir);
    }
    throw new Error('tsconfig.json not found');
  }

  export function parseDefinitionFile(filePath: string): StoreAST {
    const project = new Project({
      tsConfigFilePath: findTsConfig(filePath),
      skipAddingFilesFromTsConfig: true,
    });
    project.addSourceFileAtPath(filePath);
    const sf = project.getSourceFileOrThrow(filePath);

    // Find variable declaration whose initializer has {name, initialState, actions}
    const varDecl = sf.getVariableDeclarations().find(v => {
      const init = v.getInitializer();
      if (!init || init.getKind() !== SyntaxKind.ObjectLiteralExpression) return false;
      const obj = init.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
      const props = obj.getProperties().map(p => p.getName?.() ?? '');
      return props.includes('name') && props.includes('initialState') && props.includes('actions');
    });

    if (!varDecl) throw new Error('No StoreDefinition found in ' + filePath);

    const obj = varDecl.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

    // Extract store name
    const nameProp = obj.getPropertyOrThrow('name');
    const nameText = nameProp.getInitializer()!.getText().replace(/['"]/g, '');

    // Extract initialState source text
    const initialStateProp = obj.getPropertyOrThrow('initialState');
    const initialStateSource = initialStateProp.getInitializer()!.getText();

    // Extract actions
    const actionsProp = obj.getPropertyOrThrow('actions');
    const actionsObj = actionsProp.getInitializer()!.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

    const actions: ActionAST[] = actionsObj.getProperties().map(prop => {
      const actionName = prop.getName();
      const arrowFn = prop.getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction);
      const params = arrowFn.getParameters();

      const stateParam = params[0]?.getName() ?? 'state';
      const payloadParam = params[1] ? {
        name: params[1].getName(),
        type: params[1].getType().getText(params[1]),
      } : null;

      const bodySource = arrowFn.getBody().getText();

      return { name: actionName, stateParam, payloadParam, bodySource, returnTypeSource: 'unknown' };
    });

    return {
      name: nameText,
      stateTypeName: nameText.charAt(0).toUpperCase() + nameText.slice(1) + 'State',
      stateTypeSource: initialStateSource,
      initialStateSource,
      actions,
    };
  }

Also export StoreAST, ActionAST, ActionParamAST from packages/definition/src/index.ts
```

### 2.3 — Write AST parser tests

Create `packages/definition/src/ast-parser.test.ts`:

```
Create packages/definition/src/ast-parser.test.ts

Import parseDefinitionFile from './ast-parser'
Use 'examples/react-todo-generated/store.definition.ts' as test fixture.
Resolve the path relative to the monorepo root using path.resolve(process.cwd(), ...).

Write these tests:

1. parseDefinitionFile returns a StoreAST with name === 'todo'
2. ast.actions.length === 4
3. The 'addTodo' action has payloadParam.type === 'string'  (NOT 'any')
4. The 'toggleTodo' action has payloadParam.type === 'number'
5. The 'setFilter' action has payloadParam.type that includes 'all' and 'active' and 'completed'
6. The 'addTodo' action bodySource contains 'Date.now()' and 'title'
7. No action has bodySource equal to 'state' or containing 'return state' as the full body
8. All actions have a non-empty stateParam string

Run: npx vitest run packages/definition/src/ast-parser.test.ts
All tests must pass before proceeding.
```

### 2.4 — Rewrite generator-react to use StoreAST

```
Update packages/generator-react/src/generator.ts

Import StoreAST, ActionAST from '@polystate/definition'.

Add a new primary export function:
  export function generateFromAST(ast: StoreAST): {
    'store.ts': string;
    'hooks.ts': string;
    'types.ts': string;
  }

Rules for generateReducers() using AST:
  - Use ast.actions[i].bodySource directly — it is already the exact TypeScript source
  - Replace occurrences of ast.actions[i].stateParam with 'state' in bodySource
    (simple whole-word string replace, not regex)
  - Replace occurrences of ast.actions[i].payloadParam?.name with 'action.payload' in bodySource
  - Use ast.actions[i].payloadParam?.type for the PayloadAction<T> generic
    Result: PayloadAction<string> not PayloadAction<any>
  - If payloadParam is null, generate: (state) => bodySource  (no PayloadAction)

Rules for state interface generation:
  - Use the actual TypeScript type text from payloadParam.type
  - For fields in initialState, infer types from ast.stateTypeSource
  - Union types like 'all' | 'active' | 'completed' must be preserved exactly

Rules for generateHooks() using AST:
  - Generate typed dispatch methods using payloadParam.type:
    addTodo: (title: string) => dispatch(addTodo(title))
    toggleTodo: (id: number) => dispatch(toggleTodo(id))
    setFilter: (filter: 'all' | 'active' | 'completed') => dispatch(setFilter(filter))
  - NOT: addTodo: (payload: any) => dispatch(addTodo(payload))

IMPORTANT: Keep old generateReduxStore(definition: StoreDefinition) working unchanged.
generateFromAST is the new primary function. Old function is kept for backward compatibility.
```

### 2.5 — Rewrite generator-angular to use StoreAST

```
Update packages/generator-angular/src/generator.ts

Import StoreAST, ActionAST from '@polystate/definition'.

Add a new primary export function:
  export function generateNgRxFromAST(ast: StoreAST): {
    'state.ts': string;
    'actions.ts': string;
    'reducer.ts': string;
    'selectors.ts': string;
    'facade.ts': string;
    'store.module.ts': string;
  }

Rules for generateReducerHandlers() using AST:
  - Use ast.actions[i].bodySource directly in the on() callback
  - Replace stateParam → 'state', payloadParam.name → 'payload' via whole-word replace
  - NgRx reducers are pure (no Immer) — the spread expression is used as-is:
    on(TodoActions.addTodo, (state, { payload }) => ({ ...state, todos: [...state.todos, ...] }))
  - If no payloadParam: on(TodoActions.myAction, (state) => bodySource)

Rules for generateNgRxActions() using AST:
  - Use payloadParam.type for typed props:
    props<{ payload: string }>()   not   props<{ payload: any }>()
  - If no payloadParam: createAction('[Todo] myAction') with no props

Rules for generateNgRxState() using AST:
  - Use ast.stateTypeSource to generate the interface
  - Union types must be preserved exactly

Rules for generateAngularFacade() using AST:
  - Generate typed method signatures:
    addTodo(title: string): void { this.store.dispatch(TodoActions.addTodo({ payload: title })); }
    toggleTodo(id: number): void { ... }
  - NOT: addTodo(payload: any): void

IMPORTANT: Keep all old functions working unchanged. New functions are additional exports.
```

### 2.6 — Update CLI to use AST parser

```
Update packages/cli/src/cli.ts

In the 'generate' command, replace the require(absolutePath) approach:

  // REMOVE THIS:
  const moduleExports = require(absolutePath);
  const definition = moduleExports.default || Object.values(moduleExports)[0];
  const normalized = normalizeStoreDefinition(definition);

  // REPLACE WITH:
  import { parseDefinitionFile } from '@polystate/definition';
  const ast = parseDefinitionFile(absolutePath);

Then call the new AST-based generators:
  import { generateFromAST } from '@polystate/generator-react';
  import { generateNgRxFromAST } from '@polystate/generator-angular';

  if (generateReact) {
    const files = generateFromAST(ast);
    writeFile(path.join(outDir, 'store.ts'), files['store.ts'], overwrite);
    writeFile(path.join(outDir, 'hooks.ts'), files['hooks.ts'], overwrite);
    writeFile(path.join(outDir, 'types.ts'), files['types.ts'], overwrite);
  }

  if (generateAngular) {
    const files = generateNgRxFromAST(ast);
    Object.entries(files).forEach(([filename, content]) => {
      writeFile(path.join(outDir, filename), content, overwrite);
    });
  }

Keep the 'validate' command using require() — validation only checks structure,
not code quality, so runtime execution is fine there.
```

### 2.7 — Generator AST tests

```
Create packages/generator-react/src/generator-ast.test.ts

Import generateFromAST from './generator'.
Use parseDefinitionFile to parse 'examples/react-todo-generated/store.definition.ts'.
Call generateFromAST(ast) and inspect the output strings.

Tests:
1. store.ts contains 'PayloadAction<string>' for addTodo   (NOT 'PayloadAction<any>')
2. store.ts contains 'PayloadAction<number>' for toggleTodo
3. No output file contains the string 'PayloadAction<any>'
4. addTodo reducer body in store.ts contains 'Date.now()' — real logic, not a stub
5. The state interface in types.ts does NOT have 'filter: string'
   It must contain the union type for filter

Create packages/generator-angular/src/generator-ast.test.ts

Import generateNgRxFromAST from './generator'.
Use the same ast from parseDefinitionFile.

Tests:
1. actions.ts contains "props<{ payload: string }>()" for addTodo
2. actions.ts does NOT contain "props<{ payload: any }>()"
3. reducer.ts contains real spread logic in on() handlers — not 'return state'
4. state.ts preserves the union type for the filter field
5. facade.ts contains 'addTodo(title: string)' — typed method signature
```

### Verify Phase 2

```bash
npx vitest run    # must still show 90+ passing, all green

# Manual check — run the generator on the todo definition:
node -e "
const {parseDefinitionFile} = require('./packages/definition/src/ast-parser');
const {generateFromAST} = require('./packages/generator-react/src/generator');
const ast = parseDefinitionFile('./examples/react-todo-generated/store.definition.ts');
const files = generateFromAST(ast);
console.log(files['store.ts'].includes('PayloadAction<any>') ? 'FAIL' : 'PASS — no any');
console.log(files['store.ts'].includes('PayloadAction<string>') ? 'PASS — string typed' : 'FAIL');
"
```

**Phase 2 is done when: no `PayloadAction<any>` in generated output, union types preserved in state interfaces.**

---

## Phase 3 — Developer Experience

### 3.1 — Typed dispatch in generated hooks

```
Update generateFromAST() in generator-react and generateNgRxFromAST() in generator-angular.

In the generated hooks.ts, use ast.actions[i].payloadParam to produce typed methods:

  // Generated output must look like this:
  export function useTodoDispatch() {
    const dispatch = useAppDispatch();
    return useMemo(() => ({
      addTodo: (title: string) => dispatch(addTodo(title)),
      toggleTodo: (id: number) => dispatch(toggleTodo(id)),
      setFilter: (filter: 'all' | 'active' | 'completed') => dispatch(setFilter(filter)),
    }), [dispatch]);
  }

  // NOT:
  addTodo: (payload: any) => dispatch(addTodo(payload))

In the generated Angular facade.ts:
  addTodo(title: string): void {
    this.store.dispatch(TodoActions.addTodo({ payload: title }));
  }

Add test: hooks.ts must not contain the string '(payload: any)'.
```

### 3.2 — Auto-generated computed selectors

```
In generateFromAST() and generateNgRxFromAST(), detect this pattern in StoreAST:
  - State has an array field (e.g. 'todos')
  - State has a string or union field whose name is 'filter' or ends with 'Filter'

When detected, automatically add a computed selector and hook:

  // In store.ts — generated selectors:
  export const selectFilteredTodos = createSelector(
    selectTodos,
    selectFilter,
    (todos, filter) => {
      if (filter === 'active') return todos.filter(t => !t.done);
      if (filter === 'completed') return todos.filter(t => t.done);
      return todos;
    }
  );

  // In hooks.ts:
  export function useFilteredTodos() {
    return useSelector(selectFilteredTodos);
  }

  // In Angular facade.ts:
  filteredTodos$ = this.store.pipe(select(fromTodoSelectors.selectFilteredTodos));

Add test: for the todo definition, generated hooks.ts must contain 'useFilteredTodos'.
```

### 3.3 — Async thunk support

```
Add asyncActions support to StoreDefinition in packages/definition/src/types.ts:

  export interface StoreDefinition<TState = any> {
    name: string;
    initialState: TState;
    actions: ActionMap<TState>;
    asyncActions?: {
      [name: string]: (payload?: any) => Promise<Partial<TState>>;
    };
    description?: string;
  }

In generator-react, for each asyncAction generate createAsyncThunk():

  export const fetchTodos = createAsyncThunk(
    'todo/fetchTodos',
    async (payload: void) => {
      const data = await fetch('/api/todos').then(r => r.json());
      return data as Partial<TodoState>;
    }
  );

  // In the slice, add extraReducers:
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodos.pending, (state) => { state.loading = true; })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
        state.loading = false;
      })
      .addCase(fetchTodos.rejected, (state) => { state.loading = false; });
  }

In generator-angular, for each asyncAction generate NgRx Effects:

  @Injectable()
  export class TodoEffects {
    fetchTodos$ = createEffect(() =>
      this.actions$.pipe(
        ofType(TodoActions.fetchTodos),
        switchMap(() =>
          from(fetch('/api/todos').then(r => r.json())).pipe(
            map(data => TodoActions.fetchTodosSuccess({ payload: data })),
            catchError(err => of(TodoActions.fetchTodosFailure({ payload: err.message })))
          )
        )
      )
    );
    constructor(private actions$: Actions) {}
  }
```

### 3.4 — VS Code snippets

```
Create .vscode/polystate.code-snippets at the monorepo root.

Include these snippets:

pdef — full StoreDefinition scaffold:
  import { StoreDefinition } from '@polystate/definition';
  export const ${1:feature}Definition: StoreDefinition = {
    name: '${1:feature}',
    initialState: {
      $2
    },
    actions: {
      $3
    },
  };

pact — single action handler:
  ${1:actionName}: (state, ${2:param}: ${3:type}) => ({
    ...state,
    ${4:field}: ${5:value},
  }),

pslice — createSlice + prefixActions pattern:
  const ${1:name}Slice = createSlice(
    { ${2:field}: ${3:initialValue} },
    {
      ${4:actionName}: (state, ${5:param}: ${6:type}) => ({ ...state, ${4:actionName}: ${5:param} }),
    }
  );

Also create examples/QUICKSTART.md with:
- 3-minute getting started guide
- The 5 most common patterns with copy-paste examples
- Side-by-side comparison: without Polystate vs with Polystate
```

---

## Phase 4 — Complete Test Coverage

### 4.1 — Fix act() warnings in React tests

```
In packages/react/src/hooks.test.tsx, wrap all store.dispatch() calls
that trigger React re-renders:

  // Before:
  await store.dispatch('increment');
  expect(screen.getByText('Count: 1')).toBeTruthy();

  // After:
  await act(() => store.dispatch('increment'));
  expect(screen.getByText('Count: 1')).toBeTruthy();

Apply this to every test in hooks.test.tsx.
After fix: test output must show zero "not wrapped in act()" warnings.
```

### 4.2 — Angular Signal unit tests

```
Create packages/angular/src/service.test.ts

Use Angular TestBed to provide injection context for the select() method:

  import { TestBed } from '@angular/core/testing';
  import '@angular/compiler';

Tests:
1. select() returns the initial value as an Angular Signal
2. The signal updates when dispatch() is called
3. Multiple selectors created from the same service are independent
4. After ngOnDestroy() is called, the signal stops updating

Note: Do NOT test select() without TestBed — it requires Angular injection context by design.
The integration tests in tests/integration/angular.integration.test.ts already cover select$().
```

### 4.3 — Generator edge case tests

```
Add edge case tests to packages/generator-react/src/generator-ast.test.ts

For each handler pattern below, verify the generated reducer body is
syntactically valid TypeScript by checking that it contains expected content
and does NOT contain 'return state' stubs:

1. Block body handler:
   (state, id: number) => {
     const todo = state.todos.find(t => t.id === id);
     return { ...state, last: todo };
   }

2. Generic array payload:
   (state, items: Array<{ id: number; text: string }>) => ({
     ...state,
     todos: items,
   })

3. Union type payload:
   (state, filter: 'all' | 'active' | 'done') => ({ ...state, filter })

4. No payload handler:
   (state) => ({ ...state, loading: false })

5. Nested spread:
   (state, name: string) => ({
     ...state,
     user: { ...state.user, name },
   })

For each: ast.actions[i].bodySource must contain the actual expression,
not 'return state'.
```

### 4.4 — CLI end-to-end test

```
Create tests/integration/cli.integration.test.ts

Test the full CLI pipeline from disk:

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

1. Create a temp directory with mkdtemp
2. Write a minimal store.definition.ts to the temp dir:
   export const testDefinition = {
     name: 'test',
     initialState: { count: 0, label: 'hello' },
     actions: {
       increment: (state) => ({ ...state, count: state.count + 1 }),
       setLabel: (state, label: string) => ({ ...state, label }),
     },
   };
3. Run: execSync(`npx polystate generate ${definitionPath} --react --angular --out-dir ${outDir} --overwrite`)
4. Assert store.ts exists and contains 'configureStore'
5. Assert hooks.ts exists and contains 'useTestDispatch'
6. Assert reducer.ts exists and contains 'createReducer'
7. Assert no file contains the string 'TODO'
8. Assert no file contains 'return state' as the full reducer body
9. Assert no file contains 'PayloadAction<any>'
10. Clean up the temp directory in afterEach

The test must pass without errors.
```

---

## Phase 5 — Publishing

### 5.1 — Fix workspace:* for npm publish

```
Add to root package.json:
  "scripts": {
    "prepack": "node scripts/fix-workspace-deps.js"
  }

Create scripts/fix-workspace-deps.js:

  const fs = require('fs');
  const path = require('path');

  // Read root version map
  const packagesDir = path.resolve(__dirname, '../packages');
  const versionMap = {};
  fs.readdirSync(packagesDir).forEach(name => {
    const pkgPath = path.join(packagesDir, name, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      versionMap[pkg.name] = pkg.version;
    }
  });

  // Replace workspace:* in each package.json
  fs.readdirSync(packagesDir).forEach(name => {
    const pkgPath = path.join(packagesDir, name, 'package.json');
    if (!fs.existsSync(pkgPath)) return;
    let content = fs.readFileSync(pkgPath, 'utf-8');
    Object.entries(versionMap).forEach(([pkgName, version]) => {
      content = content.replace(
        new RegExp(`"${pkgName.replace(/\//g, '\\/')}": "workspace:\\*"`, 'g'),
        `"${pkgName}": "^${version}"`
      );
    });
    fs.writeFileSync(pkgPath, content);
  });

  console.log('workspace:* dependencies resolved');
```

### 5.2 — README before publish

```
Rewrite README.md with this structure:

1. One-liner: "Define your store once. Generate Redux for React and NgRx for Angular."

2. Quick start (5 lines):
   npm install @polystate/cli
   # write my-feature.store.definition.ts (see template below)
   npx polystate generate my-feature.store.definition.ts --react
   # → src/store/store.ts, hooks.ts, types.ts generated and ready to use

3. The problem it solves:
   Show the duplicate code problem — same state logic in React service and Angular service.
   Show the definition file that replaces both.

4. Full API reference:
   - StoreDefinition format with all field types
   - All action handler patterns (simple, payload, union type, nested, async)
   - All CLI flags and options

5. Runtime adapter usage (Mode 2 — for single-framework projects)

6. Honest status badge:
   "Core and Angular adapter: stable and tested.
    React adapter and code generator: functional, improving type coverage."

DO NOT:
- Claim production-ready until Phase 2 is complete
- Compare favorably to Redux/NgRx/Zustand on every dimension
- Omit the early-stage disclaimer
```

### Final checklist before running npm publish

```
[ ] npm run build         — all packages compile without errors
[ ] npx vitest run        — 90/90 unit tests passing
[ ] npx vitest run --config vitest.integration.config.ts — 51/51 passing
[ ] Generated store.ts contains PayloadAction<string> not PayloadAction<any>
[ ] Generated state interfaces preserve union types
[ ] npx polystate generate works on a fresh directory
[ ] workspace:* replaced in all package.json files
[ ] README is honest about project status
[ ] CHANGELOG.md updated
[ ] Version bumped with: npm run changeset
```

---

## Execution Order

| Priority | Phase | Time estimate | Unlocks |
|----------|-------|---------------|---------|
| 1 | Phase 1 — tsup configs | 30 min | 11 failing React integration tests |
| 2 | Phase 2.1–2.3 — ts-morph + ast-parser | 1 day | Foundation for correct type generation |
| 3 | Phase 2.4–2.7 — generator rewrite | 1–2 days | PayloadAction<string>, union types preserved |
| 4 | Phase 3.1–3.2 — typed hooks + selectors | 1 day | Developer experience dramatically improved |
| 5 | Phase 4 — test coverage | 1 day | Edge cases covered, E2E verified |
| 6 | Phase 3.3–3.4 — async + snippets | optional | Nice to have before publish |
| 7 | Phase 5 — publish | 2 hours | Package on npm |

---

## North Star

> A developer on a new project should be able to:
> 1. `npm install @polystate/cli`
> 2. Write a 20-line `store.definition.ts`
> 3. Run `npx polystate generate --react`
> 4. Have a fully typed, production-ready Redux store
>
> **In under 5 minutes. Zero boilerplate written by hand.**
>
> Every implementation decision should be measured against this goal.
