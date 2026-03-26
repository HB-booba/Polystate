# 🔴 BLOCKER 1: Generator Produces Incomplete Code

**Status:** ⚠️ Blocking v1.0 Release  
**Severity:** CRITICAL  
**Estimated Fix Time:** 1-2 weeks  
**Priority:** P0

---

## Problem Statement

The React and Angular code generators produce **skeleton/stub code** with empty reducer functions instead of implementing the actual action logic from the store definition.

### Current Behavior (BROKEN)

```typescript
// Input: store.definition.ts
export default {
  name: 'products',
  initialState: { items: [], selectedId: null },
  actions: {
    addProduct: (state, product) => ({
      ...state,
      items: [...state.items, product],
    }),
    removeProduct: (state, id) => ({
      ...state,
      items: state.items.filter((p) => p.id !== id),
    }),
  },
};

// Generated Output BEFORE FIX (packages/generator-react/src/generator.ts)
export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    addProduct: (state) => state, // ❌ STUB - Does nothing!
    removeProduct: (state) => state, // ❌ STUB - Does nothing!
  },
});

// Generated code doesn't work:
store.dispatch(addProduct(newProduct));
// Result: Nothing happens! Product not added to state!
```

### Root Cause

In `packages/generator-react/src/generator.ts` and `packages/generator-angular/src/generator.ts`, the `generateReducers()` functions return placeholder implementations:

```typescript
// Current implementation
function generateReducers(definition: StoreDefinition): string {
  return `
    addProduct: (state) => state,    // ❌ HARDCODED STUB
    removeProduct: (state) => state  // ❌ HARDCODED STUB
  `;
}
```

**What's Missing:**

1. AST parsing of action handler bodies
2. Serialization of function logic to strings
3. Integration with TypeScript compiler API

---

## Impact

### For End Users

```typescript
// User expects this to work:
store.dispatch(addProduct({ name: 'Laptop', price: 999 }));

// But actual state doesn't change because reducer is a stub
// Result: Silent failure, confusing debugging
```

### For v1.0 Release

- ❌ Cannot publish to npm (generators produce non-functional code)
- ❌ Example projects (react-todo-generated, angular-todo-generated) won't work
- ❌ Documentation claims "generate production-ready code" but output isn't functional
- ❌ Users cannot use @polystate/cli tool

---

## Desired Solution

### Phase 1: Complete Action Handler Serialization

Extract action handler logic from the definition and serialize it into generated code:

```typescript
// Input definition
addProduct: (state, product: Product) => ({
  ...state,
  items: [...state.items, product],
});

// Generated Output AFTER FIX
export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    addProduct: (state, action: PayloadAction<Product>) => {
      // ✅ ACTUAL LOGIC (extracted from definition)
      state.items.push(action.payload);
    },
  },
});

// Result: WORKS!
store.dispatch(addProduct(newProduct)); // ✅ Product added!
```

### Implementation Approach

#### Option A: AST-Based (Recommended)

```typescript
// 1. Extract action handler using TypeScript Compiler API
import * as ts from 'typescript';

function extractActionHandlerBody(actionName: string, definition: StoreDefinition): string {
  const handler = definition.actions[actionName];

  // Get the function body as a string
  // Transform from arrow syntax to explicit mutations (for Redux Immer)
  // Return serialized code

  return serializeToReducerCode(handler);
}

// 2. Use in generator
function generateReducers(definition: StoreDefinition): string {
  const actionNames = Object.keys(definition.actions);

  const reducersCode = actionNames
    .map((name) => {
      const body = extractActionHandlerBody(name, definition);
      return `${name}: (state, action) => { ${body} }`;
    })
    .join(',\n');

  return reducersCode;
}
```

#### Option B: Runtime Inspection (Current Limitation)

Current attempt uses `function.toString()` which doesn't work with:

- Bundled/minified code
- Complex arrow functions
- Imports/dependencies

**Not recommended** for production.

---

## Files to Modify

### React Generator

- **Location:** `packages/generator-react/src/generator.ts`
- **Functions to Fix:**
  - `generateReducers(definition)` - Currently returns stubs
  - `generateActions(definition)` - May need updates
  - New function: `extractHandlerBody(handler, name)` - Extract logic

### Angular Generator

- **Location:** `packages/generator-angular/src/generator.ts`
- **Functions to Fix:**
  - `generateNgRxReducerFromAST()` - Currently returns stubs
  - `generateNgRxActionsFromAST()` - May need updates
  - New function: `serializeToNgRxReducer()` - Serialize logic

### Definition AST Parser

- **Location:** `packages/definition/src/types.ts`
- **May need:** Enhanced AST to preserve handler bodies

---

## Testing Strategy

Create test cases in:

- `packages/generator-react/src/generator.test.ts`
- `packages/generator-angular/src/generator.test.ts`

```typescript
describe('generateReducers', () => {
  it('should generate working reducer for addProduct action', () => {
    const definition: StoreDefinition = {
      name: 'products',
      initialState: { items: [] },
      actions: {
        addProduct: (state, product) => ({
          ...state,
          items: [...state.items, product],
        }),
      },
    };

    const generated = generateReducers(definition);

    // Parse and evaluate generated code
    // Verify that calling generated reducer with product actually adds it
    expect(generated).toContain('state.items.push');
    // OR execute and verify
    const result = executeGeneratedReducer(generated, initialState, product);
    expect(result.items).toHaveLength(1);
  });
});
```

---

## Definition of Done (DoD)

- [x] Research TypeScript Compiler API for AST extraction
- [ ] Implement `extractActionHandlerBody()` function
- [ ] Handle edge cases:
  - [ ] Object spread (`...state`)
  - [ ] Array operations (`push`, `filter`, `map`, `concat`)
  - [ ] Conditional logic (`if/else`)
  - [ ] Type annotations
- [ ] Update React generator to use new function
- [ ] Update Angular generator to use new function
- [ ] Add comprehensive tests for 20+ action patterns
- [ ] Update example projects (react-todo-generated, angular-todo-generated)
- [ ] Verify examples run correctly
- [ ] Update documentation
- [ ] Run full test suite (no regressions)

---

## Acceptance Criteria

**AC1:** Generated Redux reducer actually modifies state

```typescript
// Generated code works without manual edit
const result = store.dispatch(addProduct(newProduct));
expect(store.getState().items).toContain(newProduct); // ✅ PASS
```

**AC2:** Generated NgRx reducer actually modifies state

```typescript
// Generated code works without manual edit
store.dispatch(addProduct(newProduct));
select(selectItems).subscribe((items) => {
  expect(items).toContain(newProduct); // ✅ PASS
});
```

**AC3:** Examples are fully functional

```bash
cd examples/react-todo-generated && npm start
# App loads, can add/delete todos without manual code edits ✅

cd examples/angular-todo-generated && npm start
# App loads, can add/delete todos without manual code edits ✅
```

**AC4:** No manual post-generation edits needed

```bash
polystate generate store.definition.ts --react
npm start
# App works immediately ✅
```

---

## References

- TypeScript Compiler API: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
- Current generator code: `packages/generator-react/src/generator.ts:generateReducers()`
- Redux Immer docs: https://redux-toolkit.js.org/usage/immer-and-immutability
- Example (working): `examples/react-todo-generated/src/store/store.ts` (handwritten reference)

---

## Notes

- This is a **non-trivial problem**; don't underestimate implementation time
- Consider starting with simple patterns (spread operators, array methods)
- Revisit for complex patterns (computed properties, nested state)
- May require breaking changes to how definitions are structured
- Alternative: Document that "manual reducer completion" is required post-generation (workaround, but not ideal for v1.0)

---

**Last Updated:** March 22, 2026  
**Assigned To:** @abdelhakhamri  
**Related Issues:** Generator produces stub code, Example projects don't work
