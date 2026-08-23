import { describe, expect, it } from 'vitest';
import { syncStores } from './sync';
import { createStore } from './store';

interface ProductsState {
  products: string[];
}

interface OrdersState {
  orders: string[];
  cachedProducts: string[];
}

function makeStores() {
  const productsStore = createStore<ProductsState>(
    { products: [] },
    {
      setProducts: (state, products: string[]) => ({ ...state, products }),
    }
  );
  const ordersStore = createStore<OrdersState>(
    { orders: [], cachedProducts: [] },
    {
      addOrder: (state, order: string) => ({ ...state, orders: [...state.orders, order] }),
    }
  );
  return { productsStore, ordersStore };
}

describe('syncStores', () => {
  it('syncs target immediately from the source current state', () => {
    const { productsStore, ordersStore } = makeStores();
    productsStore.dispatch('setProducts', ['a', 'b']);

    syncStores(productsStore, ordersStore, (products, orders) => ({
      ...orders,
      cachedProducts: products.products,
    }));

    expect(ordersStore.getState().cachedProducts).toEqual(['a', 'b']);
  });

  it('re-syncs on every subsequent source dispatch', async () => {
    const { productsStore, ordersStore } = makeStores();
    syncStores(productsStore, ordersStore, (products, orders) => ({
      ...orders,
      cachedProducts: products.products,
    }));

    await productsStore.dispatch('setProducts', ['x']);
    expect(ordersStore.getState().cachedProducts).toEqual(['x']);

    await productsStore.dispatch('setProducts', ['x', 'y']);
    expect(ordersStore.getState().cachedProducts).toEqual(['x', 'y']);
  });

  it('preserves target-only state untouched by the merge function', async () => {
    const { productsStore, ordersStore } = makeStores();
    await ordersStore.dispatch('addOrder', 'order-1');

    syncStores(productsStore, ordersStore, (products, orders) => ({
      ...orders,
      cachedProducts: products.products,
    }));

    await productsStore.dispatch('setProducts', ['p1']);
    expect(ordersStore.getState()).toEqual({ orders: ['order-1'], cachedProducts: ['p1'] });
  });

  it('is one-directional — writes to target never flow back to source', async () => {
    const { productsStore, ordersStore } = makeStores();
    syncStores(productsStore, ordersStore, (products, orders) => ({
      ...orders,
      cachedProducts: products.products,
    }));

    ordersStore.setState({ cachedProducts: ['manually-set'] });
    expect(productsStore.getState().products).toEqual([]);
  });

  it('stops syncing once unsubscribed', async () => {
    const { productsStore, ordersStore } = makeStores();
    const stop = syncStores(productsStore, ordersStore, (products, orders) => ({
      ...orders,
      cachedProducts: products.products,
    }));

    await productsStore.dispatch('setProducts', ['before']);
    expect(ordersStore.getState().cachedProducts).toEqual(['before']);

    stop();
    await productsStore.dispatch('setProducts', ['after']);
    expect(ordersStore.getState().cachedProducts).toEqual(['before']);
  });
});
