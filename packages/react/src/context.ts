import { createElement } from 'react';
import { createContext, useContext, ReactNode } from 'react';
import type { Store } from '@polystate/core';

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
export function createStoreContext<T>(store: Store<T>) {
    const StoreContext = createContext<Store<T> | null>(null);

    /**
     * Provider component that wraps store in context.
     */
    function Provider({ children }: { children: ReactNode }) {
        return createElement(StoreContext.Provider, { value: store }, children);
    }

    /**
     * Hook to access the store from context.
     */
    function useContextStore(): Store<T> {
        const contextStore = useContext(StoreContext);
        if (!contextStore) {
            throw new Error(
                'useContextStore must be used within a StoreContext Provider'
            );
        }
        return contextStore;
    }

    return {
        Provider,
        StoreContext,
        useContextStore,
    };
}
