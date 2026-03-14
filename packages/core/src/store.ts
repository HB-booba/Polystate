import type { Middleware, MiddlewareContext } from './middleware';
import { Signal } from './signal';

/**
 * Action handler function that receives state and optional payload.
 * @template T - The store state type
 */
export type ActionHandler<T> = (state: T, payload?: unknown) => T;

/**
 * Map of action names to their handler functions.
 * @template T - The store state type
 */
export type ActionMap<T> = Record<string, ActionHandler<T>>;

/**
 * Selector function to pick a slice from the store state.
 * @template T - The store state type
 * @template S - The selected value type
 */
export type Selector<T, S = T> = (state: T) => S;

/**
 * Subscriber callback function.
 * @template S - The value type
 */
export type Subscriber<S> = (value: S) => void;

/**
 * Unsubscribe function.
 */
export type Unsubscriber = () => void;

/**
 * Store options for configuration.
 * @template T - The store state type
 */
export interface StoreOptions<T = any> {
    /** Array of middleware functions */
    middleware?: Middleware<T>[];
    /** Enable logging for debugging */
    logging?: boolean;
}

/**
 * Thunk action - async function with dispatch and getState access.
 * @template T - The store state type
 */
export type ThunkAction<T = any> = (
    dispatch: (action: string, payload?: unknown) => void | Promise<void>,
    getState: () => T
) => void | Promise<void>;

/**
 * A reactive store with actions, middleware, and subscription support.
 * 
 * @template T - The type of the store state
 * 
 * @example
 * ```typescript
 * const store = new Store(
 *   { count: 0 },
 *   {
 *     increment: (state) => ({ ...state, count: state.count + 1 }),
 *     decrement: (state) => ({ ...state, count: state.count - 1 }),
 *   }
 * );
 * 
 * store.subscribe((state) => console.log(state));
 * store.dispatch('increment'); // { count: 1 }
 * ```
 */
export class Store<T> {
    private signal: Signal<T>;
    private actions: ActionMap<T>;
    private middleware: Middleware<T>[];
    private globalSubscribers: Set<Subscriber<T>> = new Set();
    private selectiveSubscribers: Map<Selector<T, any>, Set<Subscriber<any>>> = new Map();

    /**
     * Creates a new Store instance.
     * @param initialState - The initial state value
     * @param actions - Action map with handler functions
     * @param options - Optional configuration
     */
    constructor(initialState: T, actions: ActionMap<T>, options?: StoreOptions<T>) {
        this.signal = new Signal(initialState);
        this.actions = actions;
        this.middleware = options?.middleware ?? [];
    }

    /**
     * Gets the current state (snapshot read).
     * @param selector - Optional selector to pick a slice
     * @returns The current state or selected slice
     */
    getState(): T;
    getState<S>(selector: Selector<T, S>): S;
    getState<S>(selector?: Selector<T, S>): T | S {
        const state = this.signal.value;
        return selector ? selector(state) : state;
    }

    /**
     * Sets state with a partial update or full replacement.
     * @param patch - Partial state or full state object
     */
    setState(patch: Partial<T> | T): void {
        const prevState = this.signal.value;
        const nextState = { ...prevState, ...patch };
        this.signal.value = nextState;
        this.notifySubscribers(prevState, nextState, '__setState__');
    }

    /**
     * Dispatches an action.
     * @param action - Action name or thunk function
     * @param payload - Optional payload for the action
     */
    async dispatch(action: string | ThunkAction<T>, payload?: unknown): Promise<void> {
        // Handle thunk actions
        if (typeof action === 'function') {
            return action(
                (name: string, data?: unknown) => this.dispatch(name, data),
                () => this.getState()
            );
        }

        const prevState = this.signal.value;
        const handler = this.actions[action];

        if (!handler) {
            console.warn(`No action handler found for "${action}"`);
            return;
        }

        const nextState = handler(prevState, payload);
        this.signal.value = nextState;

        // Run middleware
        const context: MiddlewareContext<T> = {
            action,
            payload,
            prevState,
            nextState,
            dispatch: (name: string, data?: unknown) => this.dispatch(name, data),
        };

        for (const middlewareHandler of this.middleware) {
            await middlewareHandler(context);
        }

        // Notify subscribers
        this.notifySubscribers(prevState, nextState, action);
    }

    /**
     * Subscribes to all state changes.
     * @param listener - Callback invoked with new state
     * @returns Unsubscribe function
     * 
     * @example
     * ```typescript
     * const unsubscribe = store.subscribe((state) => {
     *   console.log('State changed:', state);
     * });
     * 
     * unsubscribe(); // Stop listening
     * ```
     */
    subscribe(listener: Subscriber<T>): Unsubscriber;

    /**
     * Subscribes to changes for a selected slice of state.
     * @param selector - Function to select a slice of state
     * @param listener - Callback invoked with the selected value
     * @returns Unsubscribe function
     * 
     * @example
     * ```typescript
     * const unsubscribe = store.subscribe(
     *   (state) => state.todos,
     *   (todos) => console.log('Todos changed:', todos)
     * );
     * ```
     */
    subscribe<S>(selector: Selector<T, S>, listener: Subscriber<S>): Unsubscriber;

    subscribe<S>(
        selectorOrListener: Selector<T, S> | Subscriber<T>,
        listener?: Subscriber<S>
    ): Unsubscriber {
        // Full state subscription
        if (listener === undefined) {
            const subscriber = selectorOrListener as Subscriber<T>;
            this.globalSubscribers.add(subscriber);
            return () => {
                this.globalSubscribers.delete(subscriber);
            };
        }

        // Selective subscription
        const selector = selectorOrListener as Selector<T, S>;
        if (!this.selectiveSubscribers.has(selector)) {
            this.selectiveSubscribers.set(selector, new Set());
        }
        const subscribers = this.selectiveSubscribers.get(selector)!;
        subscribers.add(listener);

        return () => {
            subscribers.delete(listener);
            if (subscribers.size === 0) {
                this.selectiveSubscribers.delete(selector);
            }
        };
    }

    /**
     * Notifies all relevant subscribers of state changes.
     */
    private notifySubscribers(prevState: T, nextState: T, _action: string): void {
        // Notify global subscribers
        this.globalSubscribers.forEach((subscriber) => {
            subscriber(nextState);
        });

        // Notify selective subscribers
        this.selectiveSubscribers.forEach((subscribers, selector) => {
            const prevValue = selector(prevState);
            const nextValue = selector(nextState);

            if (prevValue !== nextValue) {
                subscribers.forEach((subscriber) => {
                    subscriber(nextValue);
                });
            }
        });
    }
}

/**
 * Creates a new store with the given initial state and actions.
 * 
 * @template T - The type of the store state
 * @param initialState - The initial state value
 * @param actions - Action map with handler functions
 * @param options - Optional configuration
 * @returns A new Store instance
 * 
 * @example
 * ```typescript
 * const store = createStore(
 *   { count: 0, name: 'Counter' },
 *   {
 *     increment: (state) => ({ ...state, count: state.count + 1 }),
 *     setName: (state, name: string) => ({ ...state, name }),
 *   },
 *   {
 *     middleware: [loggerMiddleware()],
 *   }
 * );
 * ```
 */
export function createStore<T>(
    initialState: T,
    actions: ActionMap<T>,
    options?: StoreOptions<T>
): Store<T> {
    return new Store(initialState, actions, options);
}
