/**
 * Complex shopping-cart example — multi-store composition, middleware chain,
 * persistence, thunks, and subscription leak detection.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  asObservable,
  createSlice,
  createStore,
  distinctUntilChanged,
  loggerMiddleware,
  map,
  prefixActions,
} from '@polystate/core';

// ─── Domain types ─────────────────────────────────────────────────────────────

interface CartItem {
  id: number;
  name: string;
  qty: number;
  price: number;
}

interface CartState {
  items: CartItem[];
  coupon: string | null;
  checkoutStatus: 'idle' | 'pending' | 'done' | 'error';
}

interface UserState {
  name: string;
  email: string;
  loggedIn: boolean;
}

const cartInitial: CartState = {
  items: [],
  coupon: null,
  checkoutStatus: 'idle',
};

const userInitial: UserState = {
  name: '',
  email: '',
  loggedIn: false,
};

// ─── Slices ────────────────────────────────────────────────────────────────────

const cartSlice = createSlice(cartInitial, {
  addItem: (state, item: CartItem) => ({
    ...state,
    items: [...state.items, item],
  }),
  removeItem: (state, id: number) => ({
    ...state,
    items: state.items.filter((i) => i.id !== id),
  }),
  updateQty: (state, { id, qty }: { id: number; qty: number }) => ({
    ...state,
    items: state.items.map((i) => (i.id === id ? { ...i, qty } : i)),
  }),
  applyCoupon: (state, coupon: string) => ({ ...state, coupon }),
  clearCart: (state) => ({ ...state, items: [], coupon: null }),
  setCheckoutStatus: (state, checkoutStatus: CartState['checkoutStatus']) => ({
    ...state,
    checkoutStatus,
  }),
});

const userSlice = createSlice(userInitial, {
  login: (state, { name, email }: { name: string; email: string }) => ({
    ...state,
    name,
    email,
    loggedIn: true,
  }),
  logout: (state) => ({ ...state, name: '', email: '', loggedIn: false }),
});

// ─── Stores ────────────────────────────────────────────────────────────────────

function makeStores() {
  const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
  vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});

  const cartStore = createStore(cartInitial, cartSlice.actions, {
    middleware: [loggerMiddleware()],
  });

  const userStore = createStore(userInitial, userSlice.actions);

  return { cartStore, userStore, consoleSpy };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Complex shopping-cart example', () => {
  let cartStore: ReturnType<typeof createStore<CartState>>;
  let userStore: ReturnType<typeof createStore<UserState>>;

  beforeEach(() => {
    const stores = makeStores();
    cartStore = stores.cartStore;
    userStore = stores.userStore;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cart operations', () => {
    it('should add items to cart', async () => {
      await cartStore.dispatch('addItem', { id: 1, name: 'Book', qty: 2, price: 15 });
      await cartStore.dispatch('addItem', { id: 2, name: 'Pen', qty: 5, price: 1 });

      expect(cartStore.getState().items).toHaveLength(2);
      expect(cartStore.getState().items[0].name).toBe('Book');
    });

    it('should remove an item', async () => {
      await cartStore.dispatch('addItem', { id: 1, name: 'Book', qty: 2, price: 15 });
      await cartStore.dispatch('addItem', { id: 2, name: 'Pen', qty: 5, price: 1 });
      await cartStore.dispatch('removeItem', 1);

      expect(cartStore.getState().items).toHaveLength(1);
      expect(cartStore.getState().items[0].id).toBe(2);
    });

    it('should update item quantity', async () => {
      await cartStore.dispatch('addItem', { id: 1, name: 'Book', qty: 1, price: 15 });
      await cartStore.dispatch('updateQty', { id: 1, qty: 10 });

      expect(cartStore.getState().items[0].qty).toBe(10);
    });

    it('should apply coupon', async () => {
      await cartStore.dispatch('applyCoupon', 'SAVE10');
      expect(cartStore.getState().coupon).toBe('SAVE10');
    });

    it('should clear cart', async () => {
      await cartStore.dispatch('addItem', { id: 1, name: 'Book', qty: 1, price: 15 });
      await cartStore.dispatch('applyCoupon', 'SAVE10');
      await cartStore.dispatch('clearCart');

      expect(cartStore.getState().items).toHaveLength(0);
      expect(cartStore.getState().coupon).toBeNull();
    });
  });

  describe('user operations', () => {
    it('should log user in', async () => {
      await userStore.dispatch('login', { name: 'Alice', email: 'alice@example.com' });

      const { name, email, loggedIn } = userStore.getState();
      expect(loggedIn).toBe(true);
      expect(name).toBe('Alice');
      expect(email).toBe('alice@example.com');
    });

    it('should log user out and clear state', async () => {
      await userStore.dispatch('login', { name: 'Alice', email: 'alice@example.com' });
      await userStore.dispatch('logout');

      expect(userStore.getState().loggedIn).toBe(false);
      expect(userStore.getState().name).toBe('');
    });
  });

  describe('async thunk checkout', () => {
    it('should simulate checkout thunk (pending → done)', async () => {
      await cartStore.dispatch('addItem', { id: 1, name: 'Book', qty: 1, price: 15 });

      const checkoutThunk = async (
        dispatch: (action: string, payload?: unknown) => Promise<void>,
        _getState: () => CartState
      ) => {
        await dispatch('setCheckoutStatus', 'pending');
        // Simulate async API call
        await Promise.resolve();
        await dispatch('setCheckoutStatus', 'done');
        await dispatch('clearCart');
      };

      await cartStore.dispatch(checkoutThunk);

      expect(cartStore.getState().checkoutStatus).toBe('done');
      expect(cartStore.getState().items).toHaveLength(0);
    });

    it('should simulate checkout thunk failure', async () => {
      const failingThunk = async (
        dispatch: (action: string, payload?: unknown) => Promise<void>
      ) => {
        await dispatch('setCheckoutStatus', 'pending');
        await Promise.reject(new Error('API error')).catch(async () => {
          await dispatch('setCheckoutStatus', 'error');
        });
      };

      await cartStore.dispatch(failingThunk);
      expect(cartStore.getState().checkoutStatus).toBe('error');
    });
  });

  describe('subscription leak detection', () => {
    it('should clean up multiple subscribers without leaking', async () => {
      const calls: string[] = [];

      const unsubA = cartStore.subscribe(() => calls.push('A'));
      const unsubB = cartStore.subscribe(() => calls.push('B'));
      const unsubC = cartStore.subscribe(
        (s: CartState) => s.items.length,
        () => calls.push('C-selective')
      );

      await cartStore.dispatch('addItem', { id: 1, name: 'Book', qty: 1, price: 15 });
      expect(calls).toEqual(['A', 'B', 'C-selective']);

      unsubA();
      calls.length = 0;

      await cartStore.dispatch('addItem', { id: 2, name: 'Pen', qty: 1, price: 1 });
      expect(calls).toEqual(['B', 'C-selective']);

      unsubB();
      unsubC();
      calls.length = 0;

      await cartStore.dispatch('clearCart');
      // All unsubscribed — nothing should fire
      expect(calls).toHaveLength(0);
    });

    it('observable subscriptions should not persist after unsubscribe', async () => {
      const totals: number[] = [];

      const total$ = asObservable(cartStore).pipe(
        map((s) => s.items.reduce((sum, i) => sum + i.price * i.qty, 0)),
        distinctUntilChanged()
      );

      const sub = total$.subscribe((v) => totals.push(v));

      await cartStore.dispatch('addItem', { id: 1, name: 'Book', qty: 2, price: 10 });
      await cartStore.dispatch('addItem', { id: 2, name: 'Pen', qty: 3, price: 5 });

      expect(totals).toEqual([20, 35]);

      sub.unsubscribe();
      expect(sub.closed).toBe(true);

      await cartStore.dispatch('clearCart');
      // No new emissions after unsubscribe
      expect(totals).toEqual([20, 35]);
    });

    it('cross-store subscriptions should be independent', async () => {
      const cartEvents: number[] = [];
      const userEvents: boolean[] = [];

      const unsubCart = cartStore.subscribe(
        (s: CartState) => s.items.length,
        (len) => cartEvents.push(len)
      );
      const unsubUser = userStore.subscribe(
        (s: UserState) => s.loggedIn,
        (v) => userEvents.push(v)
      );

      await cartStore.dispatch('addItem', { id: 1, name: 'Book', qty: 1, price: 15 });
      await userStore.dispatch('login', { name: 'Alice', email: 'alice@example.com' });
      await cartStore.dispatch('clearCart');
      await userStore.dispatch('logout');

      expect(cartEvents).toEqual([1, 0]);
      expect(userEvents).toEqual([true, false]);

      unsubCart();
      unsubUser();

      await cartStore.dispatch('addItem', { id: 99, name: 'Ghost', qty: 1, price: 0 });
      await userStore.dispatch('login', { name: 'Bob', email: 'bob@example.com' });

      // No new events after cleanup
      expect(cartEvents).toEqual([1, 0]);
      expect(userEvents).toEqual([true, false]);
    });
  });

  describe('prefixActions integration', () => {
    it('should compose cart + user slices into one store', async () => {
      type AppState = {
        cart: CartState;
        user: UserState;
      };

      const appInitial: AppState = {
        cart: cartInitial,
        user: userInitial,
      };

      const appActions = {
        ...prefixActions(cartSlice.actions, 'cart'),
        ...prefixActions(userSlice.actions, 'user'),
      };

      const appStore = createStore(appInitial, appActions);

      await appStore.dispatch('cart/addItem', { id: 1, name: 'Book', qty: 1, price: 15 });
      await appStore.dispatch('user/login', { name: 'Alice', email: 'alice@example.com' });

      expect(appStore.getState().cart.items).toHaveLength(1);
      expect(appStore.getState().user.loggedIn).toBe(true);

      await appStore.dispatch('cart/clearCart');
      expect(appStore.getState().cart.items).toHaveLength(0);
      // User state should be untouched
      expect(appStore.getState().user.name).toBe('Alice');
    });
  });
});
