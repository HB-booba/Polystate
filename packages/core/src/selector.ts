import type { Selector } from './store';

/** Maps a tuple of result types to input selectors that each produce one. */
type InputSelectors<T, Args extends readonly unknown[]> = {
  [K in keyof Args]: Selector<T, Args[K]>;
};

/**
 * Creates a memoized selector from one or more input selectors and a
 * combiner. The combiner only re-runs when an input selector's result
 * changes (reference equality, `===`) since the last call — matching
 * `reselect`'s default memoization — so deriving expensive values (e.g.
 * filtering a large array) is cheap on state changes that don't affect the
 * inputs.
 *
 * Only the most recent inputs are cached (a cache size of one), which is
 * enough for the common case of one selector per store subscription; each
 * `createSelector` call keeps its own independent cache.
 *
 * @template T - The store state type
 * @template Args - Tuple of the input selectors' result types
 * @template R - The combiner's return type
 * @param args - One or more input selectors, followed by a combiner
 *   function that receives their results as positional arguments
 * @returns A memoized selector usable anywhere a plain `Selector<T, R>` is
 *   (e.g. `store.subscribe`, `store.getState`, `select()`/`select$()`)
 *
 * @example
 * ```typescript
 * const selectProducts = (state: ProductsState) => state.products;
 * const selectCategory = (state: ProductsState) => state.selectedCategory;
 *
 * const selectFilteredProducts = createSelector(
 *   selectProducts,
 *   selectCategory,
 *   (products, category) => products.filter((p) => p.category === category)
 * );
 *
 * // Only re-filters when `products` or `selectedCategory` actually change —
 * // an unrelated field changing (e.g. `loading`) reuses the cached result.
 * const filtered = selectFilteredProducts(store.getState());
 * ```
 */
export function createSelector<T, Args extends readonly unknown[], R>(
  ...args: [...InputSelectors<T, Args>, (...args: Args) => R]
): Selector<T, R> {
  const combiner = args[args.length - 1] as (...args: Args) => R;
  const inputSelectors = args.slice(0, -1) as unknown as InputSelectors<T, Args>;

  let lastArgs: Args | undefined;
  let lastResult: R;

  return (state: T): R => {
    const nextArgs = inputSelectors.map((select) => select(state)) as unknown as Args;

    if (
      lastArgs &&
      nextArgs.length === lastArgs.length &&
      nextArgs.every((value, i) => value === lastArgs![i])
    ) {
      return lastResult;
    }

    lastResult = combiner(...nextArgs);
    lastArgs = nextArgs;
    return lastResult;
  };
}
