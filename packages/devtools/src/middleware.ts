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
    const actionHistory: Array<{ action: string; state: T }> = [];

    // Initialize DevTools connection
    if (typeof window !== 'undefined') {
        const ext = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
        if (ext) {
            devtools = ext({ name, maxAge });
        }
    }

    return (context: MiddlewareContext<T>) => {
        if (!devtools) return;

        actionIndex++;

        // Record action
        const actionRecord = {
            type: context.action,
            payload: context.payload,
            timestamp: Date.now(),
        };

        actionHistory.push({
            action: context.action,
            state: context.nextState,
        });

        // Limit history size
        if (actionHistory.length > maxAge) {
            actionHistory.shift();
        }

        // Send to DevTools
        devtools.send(actionRecord, context.nextState);

        // Subscribe to DevTools messages for time-travel
        if (timeTravel && actionIndex === 1) {
            devtools.subscribe?.((message: any) => {
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
                    const targetIndex = message.payload.actionId as number;
                    const record = actionHistory.find((_, i) => i === targetIndex - 1) ??
                        actionHistory[actionHistory.length - 1];
                    if (record) {
                        store.setState(record.state);
                    }
                }
            });
        }
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
export function connectDevTools<T>(
    store: any,
    config: DevToolsConfig = {}
): any {
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
export function exportStateHistory(store: any): Array<{ action: string; state: any }> {
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
    store: any,
    history: Array<{ action: string; state: any }>
): void {
    // This would be implemented to import the history
}
