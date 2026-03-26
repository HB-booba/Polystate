# 🔴 BLOCKER 2: Type-Safe Action Dispatch Missing

**Status:** ⚠️ Blocking v1.0 Release  
**Severity:** CRITICAL  
**Estimated Fix Time:** 3-5 days  
**Priority:** P0

---

## Problem Statement

The current dispatch API uses **string-based action names** with untyped payloads, making it easy to introduce runtime errors that TypeScript cannot catch at compile time.

### Current Behavior (UNSAFE)

```typescript
// ❌ PROBLEM 1: Action name typos not caught
store.dispatch('lao dProducts', products); // Typo: Won't execute, silent failure
store.dispatch('loadProdutcs', products); // Typo: Won't execute, silent failure

// ❌ PROBLEM 2: Wrong payload type not caught
store.dispatch('loadProducts', 'wrong type'); // String instead of Product[], no error
store.dispatch('addProduct', []); // Array instead of Product, no error

// ❌ PROBLEM 3: Completely incorrect actions never caught
store.dispatch('deleteEverything', null); // Doesn't exist, no compile error

// ❌ PROBLEM 4: Refactoring is dangerous
// If you rename an action, dispatch calls don't update automatically
// Search-and-replace is error-prone
```

### Root Cause

The dispatch signature is too generic:

```typescript
// Current (loose)
dispatch(action: string, payload?: unknown): Promise<void>

// Result: No way for TypeScript to validate at compile time
```

---

## Impact

### For End Users

```typescript
// User makes a typo
store.dispatch('addProdut', newProduct);

// No error from TypeScript
// App runs, but nothing happens
// User: "Why didn't my product get added?"
// Debugging time: 30 minutes to find the typo
```

### For Large Teams

```typescript
// 15 developers working on features
// Each manually typing action names in components
// Person A: store.dispatch('addProduct')
// Person B: store.dispatch('add_product')
// Person C: store.dispatch('productAdd')

// Same action, 3 different strings = inconsistent codebase
// Causes bugs, confusion, maintenance nightmare
```

### For Refactoring

```typescript
// Decision: Rename 'addProduct' → 'createProduct'
// What gets caught:
// - addProduct function definition: ✅ TypeScript error
// - {actions: { addProduct: ... }}: ✅ TypeScript error
//
// What doesn't get caught:
// ❌ store.dispatch('addProduct') in 47 components
// ❌ String search-replace might affect comments
// ❌ Manual updates are error-prone
```

---

## Desired Solution

### Pattern: Discriminated Union Types

Create a strongly-typed dispatch system using TypeScript discriminated unions:

```typescript
// Step 1: Define all possible actions in a union type
type ProductsAction =
  | { type: 'loadProducts'; payload: Product[] }
  | { type: 'addProduct'; payload: Product }
  | { type: 'updateProduct'; payload: Product }
  | { type: 'deleteProduct'; payload: string } // ID
  | { type: 'setLoading'; payload: boolean }
  | { type: 'setError'; payload: string | null };

// Step 2: Create type-safe dispatch wrapper
function safeDispatch(store: Store<ProductsState>, action: ProductsAction) {
  store.dispatch(action.type, action.payload);
}

// Step 3: Usage becomes type-safe
// ✅ TypeScript catches typos
safeDispatch(store, {
  type: 'addProduct', // ✅ Autocomplete works
  payload: newProduct, // ✅ Type checked: must be Product
});

// ❌ These now cause compile errors:
safeDispatch(store, {
  type: 'addProdut', // ❌ TS Error: Not assignable to ProductsAction
  payload: newProduct,
});

safeDispatch(store, {
  type: 'addProduct',
  payload: 'wrong type', // ❌ TS Error: Not assignable to Product
});

safeDispatch(store, {
  type: 'deleteEverything', // ❌ TS Error: Not assignable to ProductsAction
  payload: null,
});
```

### Implementation Steps

#### Step 1: Create Action Type Union Helper

New file: `packages/core/src/action-types.ts`

```typescript
/**
 * Helper to create strongly-typed action unions
 *
 * @example
 * type UserActions = ActionsOf<{
 *   login: { username: string; password: string };
 *   logout: void;
 *   setLoading: boolean;
 * }>;
 */
export type ActionsOf<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends undefined ? { type: K } : { type: K; payload: T[K] };
}[keyof T];

// Usage
type ProductsActions = ActionsOf<{
  loadProducts: Product[];
  addProduct: Product;
  deleteProduct: string; // ID
  setLoading: boolean;
}>;

// Expands to:
// type ProductsActions =
//   | { type: 'loadProducts'; payload: Product[] }
//   | { type: 'addProduct'; payload: Product }
//   | { type: 'deleteProduct'; payload: string }
//   | { type: 'setLoading'; payload: boolean };
```

#### Step 2: Create TypedStore Interface

New file: `packages/core/src/typed-store.ts`

```typescript
/**
 * Store with strongly-typed dispatch
 */
export interface TypedStore<T, Actions extends { type: string; payload?: any }> extends Store<T> {
  /**
   * Dispatch with full type safety
   *
   * @example
   * typedStore.dispatch({
   *   type: 'addProduct',
   *   payload: newProduct
   * });
   */
  dispatch(action: Actions): Promise<void>;
}

/**
 * Create a store with type-safe dispatch
 */
export function createTypedStore<T, Actions extends { type: string; payload?: any }>(
  initialState: T,
  actions: ActionMap<T>,
  options?: StoreOptions<T>
): TypedStore<T, Actions> {
  const store = createStore(initialState, actions, options);

  // Add typed dispatch method
  return {
    ...store,
    dispatch: (action: Actions) => {
      const { type, payload } = action;
      return store.dispatch(type, payload);
    },
  };
}
```

#### Step 3: Update React Hooks

File: `packages/react/src/hooks.ts`

```typescript
/**
 * Type-safe dispatch hook
 */
export function useTypedDispatch<Actions extends { type: string; payload?: any }>(
  store: TypedStore<any, Actions>
) {
  const dispatch = useCallback(
    (action: Actions) => {
      return store.dispatch(action);
    },
    [store]
  );

  return { dispatch };
}

// Usage in component
function ProductList() {
  const store = inject(ProductsStore); // TypedStore<ProductsState, ProductsActions>
  const { dispatch } = useTypedDispatch(store);

  const onAdd = (product: Product) => {
    dispatch({
      type: 'addProduct', // ✅ Autocomplete
      payload: product, // ✅ Type checked
    });
  };
}
```

#### Step 4: Update Angular Services

File: `packages/angular/src/typed-service.ts`

```typescript
/**
 * Angular service with strongly-typed dispatch
 */
export abstract class TypedPolystateService<
  T,
  Actions extends { type: string; payload?: any },
> extends PolystateService<T> {
  /**
   * Dispatch with type safety
   */
  dispatch(action: Actions): void {
    const { type, payload } = action;
    this.store.dispatch(type, payload);
  }
}

// Usage in service
@Injectable({ providedIn: 'root' })
export class ProductsService extends TypedPolystateService<ProductsState, ProductsActions> {
  // Now dispatch is type-safe
  addProduct(product: Product) {
    this.dispatch({
      type: 'addProduct', // ✅ Autocomplete
      payload: product, // ✅ Type checked
    });
  }
}
```

---

## Migration Path

### Phase 1: Add Type-Safe Utilities (Non-Breaking)

- Add `ActionsOf<T>` helper type
- Add `TypedStore<T, Actions>` interface
- Add `createTypedStore()` factory
- Add typed hooks: `useTypedDispatch()`
- **No breaking changes** - existing code still works

### Phase 2: Update Examples

- Update example projects to use new pattern
- Document migration guide
- Show before/after in README

### Phase 3: Consider for v2.0 (Breaking)

- Maybe make typed dispatch the default
- Deprecate string-based dispatch
- Full migration guide for v1.x → v2.x users

---

## Files to Create/Modify

### New Files

- `packages/core/src/action-types.ts` - ActionsOf helper
- `packages/core/src/typed-store.ts` - TypedStore interface
- `packages/react/src/typed-hooks.ts` - useTypedDispatch hook
- `packages/angular/src/typed-service.ts` - TypedPolystateService

### Modify

- `packages/core/src/index.ts` - Export new utilities
- `packages/react/src/index.ts` - Export typed hooks
- `packages/angular/src/index.ts` - Export TypedPolystateService
- Example projects - Update to use typed pattern

### Tests

- `packages/core/src/typed-store.test.ts`
- `packages/react/src/typed-hooks.test.tsx`
- `packages/angular/src/typed-service.test.ts`

---

## Testing Strategy

```typescript
describe('TypedStore', () => {
  it('should compile with valid action', () => {
    type Actions =
      | { type: 'add'; payload: string }
      | { type: 'remove'; payload: number };

    const store = createTypedStore<State, Actions>(...);

    // ✅ This should compile
    store.dispatch({ type: 'add', payload: 'test' });
  });

  it('should fail type check with invalid action type', () => {
    // ❌ TypeScript error - not valid
    store.dispatch({ type: 'invalid', payload: 'test' });
  });

  it('should fail type check with wrong payload', () => {
    // ❌ TypeScript error - payload should be string
    store.dispatch({ type: 'add', payload: 123 });
  });
});
```

---

## Definition of Done (DoD)

- [ ] ActionsOf<T> helper type implemented and tested
- [ ] TypedStore interface created
- [ ] createTypedStore() factory implemented
- [ ] useTypedDispatch() React hook implemented
- [ ] TypedPolystateService Angular class implemented
- [ ] All new utilities exported from main index files
- [ ] Comprehensive type checking tests
- [ ] Example projects updated to use pattern
- [ ] Migration guide written in README
- [ ] No breaking changes to existing API
- [ ] Full test suite passes

---

## Acceptance Criteria

**AC1:** Type errors at compile time

```typescript
store.dispatch({ type: 'typo' }); // ❌ TS Error (good!)
```

**AC2:** Autocomplete works in IDE

```typescript
store.dispatch({
  type: '|', // Shows all valid action types
});
```

**AC3:** Wrong payloads caught

```typescript
store.dispatch({
  type: 'addProduct',
  payload: 'string', // ❌ TS Error: Expected Product
});
```

**AC4:** Backward compatible

```typescript
// Old string-based API still works
store.dispatch('addProduct', product); // ✅ Still works
```

---

## References

- TypeScript Discriminated Unions: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
- Redux Action Pattern: https://redux.js.org/understanding/thinking-in-redux
- Typed Redux Patterns: https://redux-toolkit.js.org/usage/usage-guide

---

## Priority & Timeline

**Timeline:** 3-5 days (lighter than Blocker 1)

**Why important:**

- Prevents entire class of runtime bugs
- Improves IDE developer experience (autocomplete)
- Makes refactoring safe
- Required for confident v1.0 release

---

**Last Updated:** March 22, 2026  
**Assigned To:** @abdelhakhamri  
**Depends On:** Nothing (can be done independently)
