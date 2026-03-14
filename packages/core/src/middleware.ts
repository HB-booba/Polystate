/**
 * Middleware system for Polystate stores.
 * 
 * Middleware intercepts state changes and actions, allowing for:
 * - Logging and debugging
 * - Async operations (thunks)
 * - Persistence
 * - Time-travel debugging (DevTools)
 */

/**
 * Context passed to middleware during action dispatch.
 * @template T - The store state type
 */
export interface MiddlewareContext<T> {
    action: string;
    payload: unknown;
    prevState: T;
    nextState: T;
    dispatch: (action: string, payload?: unknown) => void;
}

/**
 * Middleware function signature.
 * @template T - The store state type
 */
export type Middleware<T = any> = (context: MiddlewareContext<T>) => void | Promise<void>;

/**
 * Logger middleware - logs all actions and state changes.
 * 
 * @template T - The store state type
 * @returns Logger middleware
 * 
 * @example
 * ```typescript
 * const store = createStore(state, actions, {
 *   middleware: [loggerMiddleware()]
 * });
 * ```
 */
export function loggerMiddleware<T = any>(): Middleware<T> {
    return (context: MiddlewareContext<T>) => {
        console.group(`[${context.action}]`);
        console.log('Payload:', context.payload);
        console.log('Prev State:', context.prevState);
        console.log('Next State:', context.nextState);
        console.groupEnd();
    };
}

/**
 * Thunk middleware - enables async actions.
 * 
 * @template T - The store state type
 * @returns Thunk middleware
 * 
 * @example
 * ```typescript
 * const thunkAction = async (dispatch, getState) => {
 *   const state = getState();
 *   const result = await fetch('/api/data');
 *   dispatch('setData', result);
 * };
 * 
 * store.dispatch(thunkAction);
 * ```
 */
export function thunkMiddleware<T = any>(): Middleware<T> {
    return async (context: MiddlewareContext<T>) => {
        // Thunk middleware doesn't need to do anything on success
        // The actual thunk execution is handled by the store
    };
}

/**
 * Persistence middleware - automatically saves state to storage.
 * 
 * @template T - The store state type
 * @param key - Storage key
 * @param storage - Storage backend (default: localStorage)
 * @returns Persist middleware
 * 
 * @example
 * ```typescript
 * const store = createStore(state, actions, {
 *   middleware: [persistMiddleware('my-store')]
 * });
 * 
 * // State is automatically saved to localStorage after each action
 * ```
 */
export function persistMiddleware<T = any>(
    key: string,
    storage: Storage = typeof window !== 'undefined' ? window.localStorage : null as any
): Middleware<T> {
    return (context: MiddlewareContext<T>) => {
        try {
            if (storage) {
                storage.setItem(key, JSON.stringify(context.nextState));
            }
        } catch (error) {
            console.error(`Failed to persist state to "${key}":`, error);
        }
    };
}

/**
 * Loads persisted state from storage.
 * 
 * @template T - The store state type
 * @param key - Storage key
 * @param storage - Storage backend (default: localStorage)
 * @returns The persisted state, or null if not found
 * 
 * @example
 * ```typescript
 * const persistedState = loadPersistedState('my-store');
 * const store = createStore(persistedState ?? initialState, actions, {
 *   middleware: [persistMiddleware('my-store')]
 * });
 * ```
 */
export function loadPersistedState<T>(
    key: string,
    storage: Storage = typeof window !== 'undefined' ? window.localStorage : null as any
): T | null {
    try {
        if (!storage) return null;
        const stored = storage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error(`Failed to load persisted state from "${key}":`, error);
        return null;
    }
}

/**
 * DevTools middleware - integrates with Redux DevTools Extension.
 * Enables basic action inspection without time-travel.
 *
 * @deprecated Use `createDevToolsMiddleware(store, config)` from `@polystate/devtools`
 * instead — it supports full time-travel debugging via `store.setState()`.
 *
 * @template T - The store state type
 * @param name - Store name in DevTools
 * @returns DevTools middleware
 *
 * @example
 * ```typescript
 * // Preferred:
 * import { createDevToolsMiddleware } from '@polystate/devtools';
 * const store = createStore(state, actions, {
 *   middleware: [createDevToolsMiddleware(store, { name: 'TodoStore' })]
 * });
 * ```
 */
export function devToolsMiddleware<T = any>(name: string = 'Store'): Middleware<T> {
    const devtools =
        typeof window !== 'undefined'
            ? (window as any).__REDUX_DEVTOOLS_EXTENSION__?.({ name })
            : null;

    return (context: MiddlewareContext<T>) => {
        if (devtools) {
            devtools.send({ type: context.action, payload: context.payload }, context.nextState);
        }
    };
}
