import { describe, expect, it } from 'vitest';
import { recordActions, replayActions } from './replay';
import { createStore } from './store';

interface ProductsState {
  products: string[];
  loading: boolean;
}

function makeActions() {
  return {
    loadProducts: (state: ProductsState, products: string[]) => ({
      ...state,
      products,
      loading: false,
    }),
    addProduct: (state: ProductsState, product: string) => ({
      ...state,
      products: [...state.products, product],
    }),
    deleteProduct: (state: ProductsState, product: string) => ({
      ...state,
      products: state.products.filter((p) => p !== product),
    }),
  };
}

describe('recordActions', () => {
  it('captures dispatched actions with their type and payload, in order', async () => {
    const store = createStore<ProductsState>({ products: [], loading: true }, makeActions());
    const recorder = recordActions(store);

    await store.dispatch('loadProducts', ['a', 'b']);
    await store.dispatch('addProduct', 'c');

    expect(recorder.stop()).toEqual([
      { type: 'loadProducts', payload: ['a', 'b'] },
      { type: 'addProduct', payload: 'c' },
    ]);
  });

  it('stops capturing once stop() is called', async () => {
    const store = createStore<ProductsState>({ products: [], loading: true }, makeActions());
    const recorder = recordActions(store);

    await store.dispatch('loadProducts', ['a']);
    recorder.stop();
    await store.dispatch('addProduct', 'b');

    expect(recorder.stop()).toEqual([{ type: 'loadProducts', payload: ['a'] }]);
  });

  it('does not record actions dispatched before recording started', async () => {
    const store = createStore<ProductsState>({ products: [], loading: true }, makeActions());
    await store.dispatch('loadProducts', ['pre-existing']);

    const recorder = recordActions(store);
    await store.dispatch('addProduct', 'new');

    expect(recorder.stop()).toEqual([{ type: 'addProduct', payload: 'new' }]);
  });
});

describe('replayActions', () => {
  it('dispatches each action in order and returns the final state', async () => {
    const store = createStore<ProductsState>({ products: [], loading: true }, makeActions());

    const { finalState } = await replayActions(store, [
      { type: 'loadProducts', payload: ['a', 'b'] },
      { type: 'addProduct', payload: 'c' },
      { type: 'deleteProduct', payload: 'a' },
    ]);

    expect(finalState).toEqual({ products: ['b', 'c'], loading: false });
    expect(store.getState()).toEqual(finalState);
  });

  it('returns the state captured after each step', async () => {
    const store = createStore<ProductsState>({ products: [], loading: true }, makeActions());

    const { states } = await replayActions(store, [
      { type: 'loadProducts', payload: ['a'] },
      { type: 'addProduct', payload: 'b' },
    ]);

    expect(states).toHaveLength(2);
    expect(states[0].products).toEqual(['a']);
    expect(states[1].products).toEqual(['a', 'b']);
  });

  it('round-trips through recordActions', async () => {
    const sourceStore = createStore<ProductsState>({ products: [], loading: true }, makeActions());
    const recorder = recordActions(sourceStore);
    await sourceStore.dispatch('loadProducts', ['x']);
    await sourceStore.dispatch('addProduct', 'y');
    const recorded = recorder.stop();

    const freshStore = createStore<ProductsState>({ products: [], loading: true }, makeActions());
    const { finalState } = await replayActions(freshStore, recorded);

    expect(finalState).toEqual(sourceStore.getState());
  });

  it('accepts a recorded action list with extra fields (e.g. a DevTools timestamp)', async () => {
    const store = createStore<ProductsState>({ products: [], loading: true }, makeActions());

    // Simulates DevToolsAction[] (@polystate/devtools) — structurally wider
    // than RecordedAction, so it should compose without a cast.
    const devToolsHistory: Array<{ type: string; payload?: unknown; timestamp: number }> = [
      { type: 'addProduct', payload: 'a', timestamp: 123 },
    ];

    const { finalState } = await replayActions(store, devToolsHistory);

    expect(finalState.products).toEqual(['a']);
  });
});
