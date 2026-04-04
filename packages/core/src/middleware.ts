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
export type Middleware<T = unknown> = (context: MiddlewareContext<T>) => void | Promise<void>;

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
export function loggerMiddleware<T = unknown>(): Middleware<T> {
  return (context: MiddlewareContext<T>) => {
    console.group(`[${context.action}]`);
    console.log('Payload:', context.payload);
    console.log('Prev State:', context.prevState);
    console.log('Next State:', context.nextState);
    console.groupEnd();
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
export function persistMiddleware<T = unknown>(
  key: string,
  storage: Storage = typeof window !== 'undefined'
    ? window.localStorage
    : (null as unknown as Storage)
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
  storage: Storage = typeof window !== 'undefined'
    ? window.localStorage
    : (null as unknown as Storage)
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
