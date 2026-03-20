import type { Selector, Store } from '@polystate/core';
import { useCallback, useSyncExternalStore } from 'react';

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
  return useSyncExternalStore(
    (listener) => store.subscribe(selector, () => listener()),
    () => store.getState(selector),
    () => store.getState(selector)
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
export function useDispatch<T>(store: Store<T>) {
  const dispatch = useCallback(
    (action: string, payload?: unknown) => store.dispatch(action, payload),
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
export function useSetState<T>(store: Store<T>) {
  return useCallback((patch: Partial<T>) => store.setState(patch), [store]);
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
export function createStoreHooks<T>(store: Store<T>) {
  return {
    useStore: () => useStore(store),
    useSelector: <S>(selector: Selector<T, S>) => useSelector(store, selector),
    useDispatch: () => useDispatch(store),
    useSetState: () => useSetState(store),
  };
}
