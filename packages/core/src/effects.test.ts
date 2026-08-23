import { describe, expect, it, vi } from 'vitest';
import { effects } from './effects';
import { createStore } from './store';

interface ProductsState {
  products: string[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = { products: [], loading: false, error: null };

function makeActions() {
  return {
    loadProducts: (state: ProductsState): ProductsState => ({
      ...state,
      loading: true,
      error: null,
    }),
    loadProductsSuccess: (state: ProductsState, products: string[]): ProductsState => ({
      ...state,
      products,
      loading: false,
    }),
    loadProductsFailure: (state: ProductsState, error: unknown): ProductsState => ({
      ...state,
      loading: false,
      error: String(error),
    }),
  };
}

describe('effects', () => {
  it('dispatches `${action}Success` with the resolved value by default', async () => {
    const store = createStore(initialState, makeActions(), {
      middleware: [
        effects<ProductsState>({
          loadProducts: async () => ['a', 'b'],
        }),
      ],
    });

    await store.dispatch('loadProducts');
    expect(store.getState()).toEqual({ products: ['a', 'b'], loading: false, error: null });
  });

  it('dispatches `${action}Failure` with the caught error by default', async () => {
    const store = createStore(initialState, makeActions(), {
      middleware: [
        effects<ProductsState>({
          loadProducts: async () => {
            throw new Error('network down');
          },
        }),
      ],
    });

    await store.dispatch('loadProducts');
    const state = store.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toContain('network down');
  });

  it('leaves state untouched for actions with no registered effect', async () => {
    const store = createStore(initialState, makeActions(), {
      middleware: [effects<ProductsState>({})],
    });

    await store.dispatch('loadProducts');
    // No effect registered for 'loadProducts' — only the synchronous handler ran.
    expect(store.getState()).toEqual({ products: [], loading: true, error: null });
  });

  it('passes the dispatched payload to the handler', async () => {
    interface State {
      query: string;
      results: string[];
    }
    const handler = vi.fn(async (query: string) => [`result-for-${query}`]);

    const store = createStore<State>(
      { query: '', results: [] },
      {
        search: (state, query: string) => ({ ...state, query }),
        searchSuccess: (state, results: string[]) => ({ ...state, results }),
      },
      { middleware: [effects<State>({ search: handler })] }
    );

    await store.dispatch('search', 'shoes');
    expect(handler).toHaveBeenCalledWith(
      'shoes',
      expect.objectContaining({ getState: expect.any(Function) })
    );
    expect(store.getState().results).toEqual(['result-for-shoes']);
  });

  it('supports custom success/failure action names', async () => {
    interface State {
      value: number;
      failed: boolean;
    }
    const store = createStore<State>(
      { value: 0, failed: false },
      {
        compute: (state) => state,
        computeDone: (state, value: number) => ({ ...state, value }),
        computeBroke: (state) => ({ ...state, failed: true }),
      },
      {
        middleware: [
          effects<State>({
            compute: {
              handler: async () => 42,
              successAction: 'computeDone',
              failureAction: 'computeBroke',
            },
          }),
        ],
      }
    );

    await store.dispatch('compute');
    expect(store.getState()).toEqual({ value: 42, failed: false });
  });

  it('reads live state via getState, not a stale snapshot', async () => {
    interface State {
      multiplier: number;
      result: number;
    }
    const store = createStore<State>(
      { multiplier: 2, result: 0 },
      {
        setMultiplier: (state, multiplier: number) => ({ ...state, multiplier }),
        compute: (state) => state,
        computeSuccess: (state, result: number) => ({ ...state, result }),
      },
      {
        middleware: [
          effects<State>({
            compute: {
              handler: async (_payload, { getState }) => getState().multiplier * 10,
            },
          }),
        ],
      }
    );

    await store.dispatch('setMultiplier', 5);
    await store.dispatch('compute');
    expect(store.getState().result).toBe(50);
  });

  describe('cancelPrevious (dedup)', () => {
    it('drops the result of a superseded run by default', async () => {
      interface State {
        value: string;
      }
      // Each dispatch invokes the handler synchronously (up to its first
      // `await`), so calling `dispatch` twice in a row — without awaiting
      // in between — pushes one resolver per run before either settles.
      const resolvers: Array<(v: string) => void> = [];
      const handler = () => new Promise<string>((resolve) => resolvers.push(resolve));

      const store = createStore<State>(
        { value: '' },
        {
          load: (state) => state,
          loadSuccess: (state, value: string) => ({ ...state, value }),
        },
        { middleware: [effects<State>({ load: handler })] }
      );

      const firstDispatch = store.dispatch('load');
      const secondDispatch = store.dispatch('load');
      expect(resolvers).toHaveLength(2);

      // Resolve the stale first run *after* the second — it should still
      // lose, since the second dispatch already superseded it.
      resolvers[0]('stale');
      resolvers[1]('fresh');
      await Promise.all([firstDispatch, secondDispatch]);

      expect(store.getState().value).toBe('fresh');
    });

    it('lets every run report back when cancelPrevious is false', async () => {
      interface State {
        count: number;
      }
      const store = createStore<State>(
        { count: 0 },
        {
          bump: (state) => state,
          bumpSuccess: (state, by: number) => ({ ...state, count: state.count + by }),
        },
        {
          middleware: [
            effects<State>({
              bump: { handler: async () => 1, cancelPrevious: false },
            }),
          ],
        }
      );

      await Promise.all([store.dispatch('bump'), store.dispatch('bump')]);
      expect(store.getState().count).toBe(2);
    });
  });
});
