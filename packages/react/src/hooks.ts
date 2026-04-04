import type { ActionMap, Selector, Store } from '@polystate/core';
import { useCallback, useRef, useSyncExternalStore } from 'react';

/**
 * Subscribes to the entire store state using React's useSyncExternalStore.
 * Ensures proper synchronization between store updates and React rendering.
 *
 * @template T - The store state type
 * @param store - The Polystate store
 * @returns The current state
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const state = useStore(todoStore);
 *   return <div>{state.count}</div>;
 * }
 * ```
 */
export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getState(),
    () => store.getState()
  );
}

/**
 * Selects a slice of the store state using a selector function.
 * Only triggers re-renders when the selected value changes.
 *
 * @template T - The store state type
 * @template S - The selected value type
 * @param store - The Polystate store
 * @param selector - Function to select a slice of state
 * @returns The selected state slice
 *
 * @example
 * ```typescript
 * function TodoList() {
 *   const todos = useSelector(todoStore, (state) => state.todos);
 *   return <div>{todos.length} todos</div>;
 * }
 * ```
 */
export function useSelector<T, S>(store: Store<T>, selector: Selector<T, S>): S {
  // Stable ref prevents re-subscribing on every render when an inline arrow is used.
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const stableSubscribe = useCallback(
    (listener: () => void) =>
      store.subscribe(
        (state: T) => selectorRef.current(state),
        () => listener()
      ),
    [store]
  );

  return useSyncExternalStore(
    stableSubscribe,
    () => store.getState(selectorRef.current),
    () => store.getState(selectorRef.current)
  );
}

/**
 * Dispatches actions to the store.
 * Returns memoized dispatch functions bound to the store.
 *
 * @template T - The store state type
 * @param store - The Polystate store
 * @returns Object with dispatch function
 *
 * @example
 * ```typescript
 * function Counter() {
 *   const { dispatch } = useDispatch(store);
 *   return <button onClick={() => dispatch('increment')}>+</button>;
 * }
 * ```
 */
export function useDispatch<T, A extends ActionMap<T>>(
  store: Store<T, A>
): {
  dispatch: (action: keyof A & string, payload?: unknown) => Promise<void>;
} {
  const dispatch = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (action: keyof A & string, payload?: unknown) => store.dispatch(action, payload as any),
    [store]
  );

  return { dispatch };
}

/**
 * Sets state with a partial update.
 * Provides a convenient way to update state without defining actions.
 *
 * @template T - The store state type
 * @param store - The Polystate store
 * @returns Function to update state
 *
 * @example
 * ```typescript
 * function UserForm() {
 *   const setState = useSetState(store);
 *
 *   const handleNameChange = (name: string) => {
 *     setState({ name });
 *   };
 * }
 * ```
 */
export function useSetState<T>(store: Store<T>): (patch: Partial<T>) => void {
  return useCallback((patch: Partial<T>) => store.setState(patch), [store]);
}

export interface StoreHooks<T, A extends ActionMap<T> = ActionMap<T>> {
  useStore: () => T;
  useSelector: <S>(selector: Selector<T, S>) => S;
  useDispatch: () => { dispatch: (action: keyof A & string, payload?: unknown) => Promise<void> };
  useSetState: () => (patch: Partial<T>) => void;
}

/**
 * Factory function to create pre-bound hooks for a specific store.
 * Useful for avoiding repeated store prop passing.
 *
 * @template T - The store state type
 * @param store - The Polystate store
 * @returns Object with bound hook functions
 *
 * @example
 * ```typescript
 * const todoStore = createStore({ todos: [] }, ...);
 * const {
 *   useStore: useTodoStore,
 *   useSelector: useTodoSelector,
 *   useDispatch: useTodoDispatch,
 *   useSetState: useTodoSetState,
 * } = createStoreHooks(todoStore);
 *
 * // In components:
 * function TodoList() {
 *   const todos = useTodoSelector((state) => state.todos);
 * }
 * ```
 */
export function createStoreHooks<T, A extends ActionMap<T>>(store: Store<T, A>): StoreHooks<T, A> {
  return {
    useStore: () => useStore(store),
    useSelector: <S>(selector: Selector<T, S>) => useSelector(store, selector),
    useDispatch: () => useDispatch(store),
    useSetState: () => useSetState(store),
  };
}
