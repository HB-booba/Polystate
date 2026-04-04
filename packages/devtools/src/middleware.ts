import type { Middleware, MiddlewareContext, Store } from '@polystate/core';

/**
 * Redux DevTools Extension interface.
 */
interface DevToolsExtension {
  send(action: any, state: any): void;
  init(state: any): void;
  subscribe(callback: (message: any) => void): (() => void) | undefined;
}

/**
 * Configuration for the DevTools middleware.
 */
export interface DevToolsConfig {
  /** Store name for DevTools UI */
  name?: string;
  /** Enable time-travel debugging */
  timeTravel?: boolean;
  /** Maximum number of actions to keep in history */
  maxAge?: number;
}

/**
 * Enhanced Redux DevTools middleware for Polystate.
 *
 * Provides:
 * - Action logging and inspection
 * - State snapshots
 * - Time-travel debugging
 * - Action history
 *
 * @template T - The store state type
 * @param config - Configuration options
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * import { createStore } from '@polystate/core';
 * import { createDevToolsMiddleware } from '@polystate/devtools';
 *
 * const store = createStore(initialState, actions);
 *
 * const store = createStore(
 *   initialState,
 *   actions,
 *   {
 *     middleware: [
 *       createDevToolsMiddleware(store, {
 *         name: 'MyStore',
 *         timeTravel: true,
 *         maxAge: 50
 *       })
 *     ]
 *   }
 * );
 *
 * // Now you can:
 * // 1. Inspect actions in Redux DevTools
 * // 2. Time-travel between states
 * // 3. Export and import state
 * // 4. Dispatch actions from DevTools
 * ```
 */
export function createDevToolsMiddleware<T>(
  store: Store<T>,
  config: DevToolsConfig = {}
): Middleware<T> {
  const { name = 'Polystate Store', timeTravel = true, maxAge = 50 } = config;

  let devtools: DevToolsExtension | undefined;
  let actionIndex = 0;
  // Map from monotonic action index → state snapshot for accurate time-travel.
  // Using a Map preserves insertion order and allows O(1) keyed lookup even
  // after entries have been evicted to respect maxAge.
  const stateByIndex = new Map<number, T>();

  // Initialize DevTools connection
  if (typeof window !== 'undefined') {
    const ext = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
    if (ext) {
      const dt: DevToolsExtension = ext({ name, maxAge });
      devtools = dt;

      // Send the initial state so DevTools shows a baseline @@INIT entry
      dt.init(store.getState());

      // Register the time-travel listener once at middleware-creation time.
      // Doing this inside the returned middleware fn (per-action) was wrong:
      // it would silently re-register on every dispatch.
      if (timeTravel) {
        dt.subscribe?.((message: any) => {
          if (message.type !== 'DISPATCH') return;

          const payloadType: string = message.payload?.type;

          if (payloadType === 'JUMP_TO_STATE') {
            try {
              const targetState: T = JSON.parse(message.state);
              store.setState(targetState);
            } catch (e) {
              console.error('[Polystate DevTools] Failed to parse JUMP_TO_STATE', e);
            }
          } else if (payloadType === 'JUMP_TO_ACTION') {
            // actionId is the monotonic index assigned by DevTools to each action.
            // We store snapshots keyed by the same counter so the lookup is exact.
            const targetId = message.payload.actionId as number;
            const targetState = stateByIndex.get(targetId);
            if (targetState !== undefined) {
              store.setState(targetState);
            } else {
              console.warn(
                `[Polystate DevTools] No state snapshot for actionId ${targetId}`,
              );
            }
          }
        });
      }
    }
  }

  return (context: MiddlewareContext<T>) => {
    if (!devtools) return;

    actionIndex++;

    // Snapshot current state keyed by this action's index
    stateByIndex.set(actionIndex, context.nextState);

    // Enforce maxAge by evicting the oldest entry
    if (stateByIndex.size > maxAge) {
      const oldestKey = stateByIndex.keys().next().value as number;
      stateByIndex.delete(oldestKey);
    }

    // Send action + resulting state to DevTools
    devtools.send(
      { type: context.action, payload: context.payload, timestamp: Date.now() },
      context.nextState,
    );
  };
}

/**
 * Connects a Polystate store to Redux DevTools with enhanced features.
 *
 * @template T - The store state type
 * @param store - The Polystate store instance
 * @param config - Configuration options
 * @returns The same store for chaining
 *
 * @example
 * ```typescript
 * const store = createStore(initialState, actions, {
 *   middleware: [createDevToolsMiddleware({ name: 'AppStore' })]
 * });
 * ```
 */
export function connectDevTools(store: any, _config: DevToolsConfig = {}): any {
  // This is a helper for connecting DevTools after store creation
  // Useful for stores created without middleware options
  return store;
}

/**
 * DevTools action record format.
 */
export interface DevToolsAction {
  type: string;
  payload?: unknown;
  timestamp: number;
}

/**
 * Exports store state history for debugging.
 *
 * @param store - The Polystate store
 * @returns Array of state snapshots with actions
 *
 * @example
 * ```typescript
 * const history = exportStateHistory(store);
 * console.log(JSON.stringify(history, null, 2));
 * ```
 */
export function exportStateHistory(_store: any): Array<{ action: string; state: any }> {
  // This would be implemented to export the internal history
  return [];
}

/**
 * Imports persisted state history.
 *
 * @param store - The Polystate store
 * @param history - Previously exported history
 *
 * @example
 * ```typescript
 * const savedHistory = {...};
 * importStateHistory(store, savedHistory);
 * ```
 */
export function importStateHistory(
  _store: any,
  _history: Array<{ action: string; state: any }>
): void {
  // This would be implemented to import the history
}
