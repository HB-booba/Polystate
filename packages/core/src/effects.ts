import type { Middleware, MiddlewareContext } from './middleware';

/**
 * Runs the async side effect for a dispatched action.
 * @template T - The store state type
 * @template P - The dispatched action's payload type
 * @template R - The resolved value, forwarded as the success action's payload
 */
export type EffectHandler<T, P = unknown, R = unknown> = (
  payload: P,
  api: { getState: () => T }
) => Promise<R>;

/**
 * Options controlling how an effect reports back to the store.
 */
export interface EffectOptions<T, P = unknown, R = unknown> {
  /** The async work to run. */
  handler: EffectHandler<T, P, R>;
  /** Action dispatched with the resolved value. Defaults to `${action}Success`. */
  successAction?: string;
  /** Action dispatched with the caught error. Defaults to `${action}Failure`. */
  failureAction?: string;
  /**
   * When true (the default), dispatching the triggering action again before
   * this run settles supersedes it — its result or error is dropped instead
   * of reaching the store, matching RxJS `switchMap` semantics. Set to
   * `false` to let every run report back independently.
   */
  cancelPrevious?: boolean;
}

type EffectEntry<T> = EffectHandler<T> | EffectOptions<T>;

/**
 * Maps action names to the effect that runs when that action is dispatched.
 * @template T - The store state type
 */
export type EffectMap<T> = Record<string, EffectEntry<T>>;

/**
 * Creates middleware that runs async side effects in response to dispatched
 * actions — the Mode 2 (`createStore`) equivalent of the effects generated
 * codegen produces for NgRx. For each action in `map`, dispatching it runs
 * the handler and automatically dispatches a success or failure action with
 * the outcome; by default a new dispatch of the same action cancels the
 * previous run's report (dedup), so races can't land a stale result.
 *
 * The success/failure actions are plain dispatches — give them handlers in
 * your action map (e.g. to set `loading`/`error` fields) the same way you
 * would handle any other action.
 *
 * @template T - The store state type
 * @param map - Action name → effect handler (or {@link EffectOptions})
 * @returns Middleware to pass in `createStore`'s `middleware` option
 *
 * @example
 * ```typescript
 * const store = createStore(
 *   { products: [], loading: false, error: null as string | null },
 *   {
 *     loadProducts: (state) => ({ ...state, loading: true, error: null }),
 *     loadProductsSuccess: (state, products: Product[]) => ({
 *       ...state, products, loading: false,
 *     }),
 *     loadProductsFailure: (state, error: unknown) => ({
 *       ...state, loading: false, error: String(error),
 *     }),
 *   },
 *   {
 *     middleware: [
 *       effects({
 *         loadProducts: () => api.getProducts(),
 *       }),
 *     ],
 *   }
 * );
 *
 * store.dispatch('loadProducts');
 * // ✓ loading set synchronously by the loadProducts handler
 * // ✓ loadProductsSuccess/Failure dispatched automatically when the effect settles
 * // ✓ a second dispatch('loadProducts') before the first resolves discards the first's result
 * ```
 */
export function effects<T>(map: EffectMap<T>): Middleware<T> {
  const generation = new Map<string, number>();

  return (context: MiddlewareContext<T>): Promise<void> | void => {
    const entry = map[context.action];
    if (!entry) return;

    const opts: EffectOptions<T> = typeof entry === 'function' ? { handler: entry } : entry;
    const { handler, successAction, failureAction, cancelPrevious = true } = opts;

    const action = context.action;
    const run = (generation.get(action) ?? 0) + 1;
    generation.set(action, run);
    const isStale = () => cancelPrevious && generation.get(action) !== run;

    return (async () => {
      try {
        const result = await handler(context.payload, { getState: context.getState });
        if (isStale()) return;
        await context.dispatch(successAction ?? `${action}Success`, result);
      } catch (error) {
        if (isStale()) return;
        await context.dispatch(failureAction ?? `${action}Failure`, error);
      }
    })();
  };
}
