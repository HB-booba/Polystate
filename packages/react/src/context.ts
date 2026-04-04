import type { ActionMap, Selector, Store } from '@polystate/core';
import { Context, createContext, createElement, ReactElement, ReactNode, useContext } from 'react';
import {
  useDispatch as useDispatchFn,
  useSelector as useSelectorFn,
  useSetState as useSetStateFn,
  useStore as useStoreFn,
} from './hooks';

/**
 * Creates a React Context for a Polystate store.
 * Enables passing the store through the component tree without prop drilling.
 *
 * @template T - The store state type
 * @param store - The Polystate store
 * @returns Object with Provider component, context, and useStore hook
 *
 * @example
 * ```typescript
 * const { Provider, useStore: useAppStore } = createStoreContext(appStore);
 *
 * function App() {
 *   return (
 *     <Provider>
 *       <MyComponent />
 *     </Provider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const state = useAppStore();
 * }
 * ```
 */
export function createStoreContext<T, A extends ActionMap<T> = ActionMap<T>>(
  store: Store<T, A>
): {
  Provider: ({ children }: { children: ReactNode }) => ReactElement;
  StoreContext: Context<Store<T, A> | null>;
  /** Returns the current state — re-renders on every state change. */
  useStore: () => T;
  /** Returns a selected slice — only re-renders when the selected value changes. */
  useSelector: <S>(selector: Selector<T, S>) => S;
  /** Returns a memoized dispatch function with typed action names. */
  useDispatch: () => { dispatch: (action: keyof A & string, payload?: unknown) => Promise<void> };
  /** Returns a partial-update setter. */
  useSetState: () => (patch: Partial<T>) => void;
  /** @advanced Returns the raw Store instance — for use with lower-level hooks. */
  useContextStore: () => Store<T, A>;
} {
  const StoreContext = createContext<Store<T, A> | null>(null);

  /**
   * Provider component that wraps store in context.
   */
  function Provider({ children }: { children: ReactNode }) {
    return createElement(StoreContext.Provider, { value: store }, children);
  }

  /**
   * Hook to access the store from context.
   */
  function useContextStore(): Store<T, A> {
    const contextStore = useContext(StoreContext);
    if (!contextStore) {
      throw new Error('useContextStore must be used within a StoreContext Provider');
    }
    return contextStore;
  }

  return {
    Provider,
    StoreContext,
    useContextStore,
    useStore: () => useStoreFn(store),
    useSelector: <S>(selector: Selector<T, S>) => useSelectorFn(store, selector),
    useDispatch: () => useDispatchFn(store),
    useSetState: () => useSetStateFn(store),
  };
}
