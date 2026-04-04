import type { Middleware, MiddlewareContext } from './middleware';
import { loggerMiddleware } from './middleware';
import { Signal } from './signal';

/**
 * Action handler function that receives state and optional payload.
 * @template T - The store state type
 * @template P - The payload type (defaults to `any` so specific types are inferred by callers)
 */
export type ActionHandler<T, P = any> = (state: T, payload?: P) => T;

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
export interface StoreOptions<T = unknown> {
  /** Array of middleware functions */
  middleware?: Middleware<T>[];
  /** Enable logging for debugging */
  logging?: boolean;
}

/**
 * Thunk action - async function with dispatch and getState access.
 * @template T - The store state type
 */
export type ThunkAction<T = unknown> = (
  dispatch: (action: string | ThunkAction<T>, payload?: unknown) => Promise<void>,
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
/** @internal Infers the payload type from an action handler for typed dispatch. */
type DispatchPayload<F> = F extends (state: any, payload: infer P) => any ? P : unknown;

export class Store<T, A extends ActionMap<T> = ActionMap<T>> {
  private signal: Signal<T>;
  private actions: A;
  private middleware: Middleware<T>[];
  private globalSubscribers: Set<Subscriber<T>> = new Set();
  private selectiveSubscribers: Map<Selector<T, unknown>, Set<Subscriber<unknown>>> = new Map();
  private readonly initialState: T;
  private _destroyed = false;

  /**
   * Creates a new Store instance.
   * @param initialState - The initial state value
   * @param actions - Action map with handler functions
   * @param options - Optional configuration
   */
  constructor(initialState: T, actions: A, options?: StoreOptions<T>) {
    this.initialState = initialState;
    this.signal = new Signal(initialState);
    this.actions = actions;
    const extra: Middleware<T>[] = options?.logging ? [loggerMiddleware()] : [];
    this.middleware = [...extra, ...(options?.middleware ?? [])];
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
   * Dispatches an action to the store. Action names are type-checked at compile
   * time — dispatching an unregistered action is a TypeScript error, not a
   * silent runtime warning.
   *
   * @param action - Registered action name or thunk function
   * @param payload - Optional payload forwarded to the action handler
   */
  dispatch<K extends keyof A & string>(action: K, payload?: DispatchPayload<A[K]>): Promise<void>;
  dispatch(action: ThunkAction<T>): Promise<void>;
  dispatch(action: (keyof A & string) | ThunkAction<T>, payload?: unknown): Promise<void> {
    return this._dispatch(action, payload);
  }

  private async _dispatch(action: string | ThunkAction<T>, payload?: unknown): Promise<void> {
    if (this._destroyed) return;

    if (typeof action === 'function') {
      return action(
        (name, data) => this._dispatch(name, data),
        () => this.getState()
      ) as Promise<void>;
    }

    const prevState = this.signal.value;
    const handler = this.actions[action];

    if (!handler) {
      console.warn(`No action handler found for "${action}"`);
      return;
    }

    const nextState = handler(prevState, payload);
    this.signal.value = nextState;

    const context: MiddlewareContext<T> = {
      action,
      payload,
      prevState,
      nextState,
      dispatch: (name: string, data?: unknown) => this._dispatch(name, data),
    };

    for (const mw of this.middleware) {
      await mw(context);
    }

    this.notifySubscribers(prevState, nextState, action);
  }

  /**
   * Adds a middleware function to the store's pipeline at runtime.
   * Useful for integrating third-party tools (e.g. DevTools) after store creation.
   *
   * @param mw - Middleware to append
   */
  addMiddleware(mw: Middleware<T>): void {
    this.middleware.push(mw);
  }

  /**
   * Returns the names of all registered action handlers.
   */
  getActionNames(): string[] {
    return Object.keys(this.actions);
  }

  /**
   * Resets the store to its initial state and notifies all subscribers.
   * Useful for testing and hard resets (e.g. on logout).
   */
  reset(): void {
    const prevState = this.signal.value;
    this.signal.value = this.initialState;
    this.notifySubscribers(prevState, this.initialState, '__reset__');
  }

  /**
   * Destroys the store — removes all subscribers and prevents further updates.
   * Call when the store is no longer needed to avoid memory leaks in long-lived
   * applications that create stores dynamically.
   */
  destroy(): void {
    this._destroyed = true;
    this.globalSubscribers.clear();
    this.selectiveSubscribers.clear();
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
    subscribers.add(listener as Subscriber<unknown>);

    return () => {
      subscribers.delete(listener as Subscriber<unknown>);
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
export function createStore<T, A extends ActionMap<T>>(
  initialState: T,
  actions: A,
  options?: StoreOptions<T>
): Store<T, A> {
  return new Store(initialState, actions, options);
}
