import type { Store, Unsubscriber } from './store';

/**
 * Computes the target store's next state from the source store's current
 * state and the target's own current state.
 * @template S - The source store's state type
 * @template T - The target store's state type
 */
export type SyncMerge<S, T> = (sourceState: S, targetState: T) => T;

/**
 * Keeps `target`'s state in sync with `source`'s, without manually wiring
 * up a subscription — e.g. a shared "current user" slice mirrored into
 * several independent feature stores.
 *
 * `merge` runs once immediately (so `target` starts in sync) and again on
 * every subsequent `source` dispatch, and its result is applied via
 * `target.setState()`. Sync is one-directional: writes to `target` never
 * flow back to `source`. To sync more than two stores, call `syncStores`
 * once per source/target pair.
 *
 * @template S - The source store's state type
 * @template T - The target store's state type
 * @param source - The store to read from
 * @param target - The store to keep in sync
 * @param merge - Computes `target`'s next state from both stores' current state
 * @returns Unsubscribe function — stops future syncing; `target` keeps its
 *   last-synced state
 *
 * @example
 * ```typescript
 * // Mirror the products list into the orders store as a cache.
 * const stopSync = syncStores(productsStore, ordersStore, (products, orders) => ({
 *   ...orders,
 *   cachedProducts: products.products,
 * }));
 *
 * // Later, to stop mirroring:
 * stopSync();
 * ```
 */
export function syncStores<S, T>(
  source: Store<S>,
  target: Store<T>,
  merge: SyncMerge<S, T>
): Unsubscriber {
  const apply = (sourceState: S) => {
    target.setState(merge(sourceState, target.getState()));
  };

  apply(source.getState());
  return source.subscribe(apply);
}
