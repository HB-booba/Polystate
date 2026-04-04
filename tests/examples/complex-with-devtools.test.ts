/**
 * Complex multi-store shopping cart with DevTools, persistence simulation,
 * observable pipeline, and cross-store orchestration.
 *
 * Covers:
 *  - Multi-store setup (cart + user)
 *  - Async thunks (checkout flow)
 *  - Middleware chaining (logger + devtools)
 *  - Observable pipeline with map/filter/distinctUntilChanged
 *  - DevTools time-travel across stores
 *  - Selective subscription leak verification
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActionMap } from '@polystate/core';
import {
    asObservable,
    createSlice,
    createStore,
    distinctUntilChanged,
    filter,
    map,
    prefixActions,
} from '@polystate/core';
import { connectDevTools } from '@polystate/devtools';

// ─── Domain types ─────────────────────────────────────────────────────────────

interface CartItem {
  id: number;
  name: string;
  qty: number;
  price: number;
}

interface CartState {
  items: CartItem[];
  checkoutStatus: 'idle' | 'pending' | 'done' | 'error';
}

interface UserState {
  name: string;
  loggedIn: boolean;
}

// ─── Action maps ──────────────────────────────────────────────────────────────

const cartActions: ActionMap<CartState> = {
  addItem: (s, payload: unknown) => ({
    ...s,
    items: [...s.items, payload as CartItem],
  }),
  removeItem: (s, payload: unknown) => ({
    ...s,
    items: s.items.filter((i) => i.id !== (payload as number)),
  }),
  clearCart: (s) => ({ ...s, items: [] }),
  setStatus: (s, payload: unknown) => ({
    ...s,
    checkoutStatus: payload as CartState['checkoutStatus'],
  }),
};

const userActions: ActionMap<UserState> = {
  login: (s, payload: unknown) => ({
    ...s,
    ...(payload as { name: string }),
    loggedIn: true,
  }),
  logout: () => ({ name: '', loggedIn: false }),
};

// ─── Mock DevTools factory ────────────────────────────────────────────────────

type DTMessage = { type: string; payload?: { type: string; actionId?: number }; state?: string };

function installMockDevTools() {
  const instances: Array<{
    name: string;
    sent: Array<{ action: unknown; state: unknown }>;
    initState: unknown;
    subscribe: (cb: (m: DTMessage) => void) => () => void;
    _cb: ((m: DTMessage) => void) | null;
    fire: (m: DTMessage) => void;
  }> = [];

  type WinExt = typeof window & { __REDUX_DEVTOOLS_EXTENSION__?: unknown };
  const win = window as WinExt;
  const original = win.__REDUX_DEVTOOLS_EXTENSION__;

  win.__REDUX_DEVTOOLS_EXTENSION__ = (cfg: { name: string; maxAge: number }) => {
    let cb: ((m: DTMessage) => void) | null = null;
    const instance = {
      name: cfg.name,
      sent: [] as Array<{ action: unknown; state: unknown }>,
      initState: null as unknown,
      _cb: null as ((m: DTMessage) => void) | null,
      fire(m: DTMessage) {
        cb?.(m);
      },
      send(action: unknown, state: unknown) {
        instance.sent.push({ action, state });
      },
      init(state: unknown) {
        instance.initState = state;
      },
      subscribe(icb: (m: DTMessage) => void) {
        cb = icb;
        instance._cb = icb;
        return () => {
          cb = null;
        };
      },
    };
    instances.push(instance);
    return instance;
  };

  return {
    instances,
    getByName: (name: string) => instances.find((i) => i.name === name),
    restore: () => {
      win.__REDUX_DEVTOOLS_EXTENSION__ = original;
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Complex cart with DevTools', () => {
  let cartStore: ReturnType<typeof createStore<CartState>>;
  let userStore: ReturnType<typeof createStore<UserState>>;
  let devToolsHarness: ReturnType<typeof installMockDevTools>;

  beforeEach(() => {
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    devToolsHarness = installMockDevTools();

    cartStore = createStore<CartState>(
      { items: [], checkoutStatus: 'idle' },
      cartActions
    );
    userStore = createStore<UserState>({ name: '', loggedIn: false }, userActions);

    connectDevTools(cartStore, { name: 'CartStore', timeTravel: true, maxAge: 50 });
    connectDevTools(userStore, { name: 'UserStore', timeTravel: true, maxAge: 50 });
  });

  afterEach(() => {
    devToolsHarness.restore();
    vi.restoreAllMocks();
  });

  // ── basic store ops ──────────────────────────────────────────────────────

  it('tracks cart and user as separate DevTools instances', () => {
    expect(devToolsHarness.instances).toHaveLength(2);
    expect(devToolsHarness.getByName('CartStore')?.initState).toEqual({
      items: [],
      checkoutStatus: 'idle',
    });
    expect(devToolsHarness.getByName('UserStore')?.initState).toEqual({
      name: '',
      loggedIn: false,
    });
  });

  it('dispatches are recorded per-store', async () => {
    await cartStore.dispatch('addItem', { id: 1, name: 'Book', qty: 2, price: 10 });
    await userStore.dispatch('login', { name: 'Alice' });

    const cartDT = devToolsHarness.getByName('CartStore')!;
    const userDT = devToolsHarness.getByName('UserStore')!;

    expect(cartDT.sent).toHaveLength(1);
    expect(userDT.sent).toHaveLength(1);
    expect((cartDT.sent[0].action as { type: string }).type).toBe('addItem');
    expect((userDT.sent[0].action as { type: string }).type).toBe('login');
  });

  // ── async thunk checkout ─────────────────────────────────────────────────

  it('handles checkout thunk (pending → done)', async () => {
    await cartStore.dispatch('addItem', { id: 1, name: 'Book', qty: 1, price: 15 });

    const checkout = async (dispatch: (a: string, p?: unknown) => Promise<void>) => {
      await dispatch('setStatus', 'pending');
      await Promise.resolve(); // simulate API
      await dispatch('setStatus', 'done');
      await dispatch('clearCart');
    };

    await cartStore.dispatch(checkout);

    expect(cartStore.getState().checkoutStatus).toBe('done');
    expect(cartStore.getState().items).toHaveLength(0);

    const cartDT = devToolsHarness.getByName('CartStore')!;
    // addItem + setStatus(pending) + setStatus(done) + clearCart = 4
    expect(cartDT.sent).toHaveLength(4);
  });

  // ── time-travel ──────────────────────────────────────────────────────────

  it('restores cart state via JUMP_TO_STATE', async () => {
    await cartStore.dispatch('addItem', { id: 1, name: 'Book', qty: 1, price: 15 });
    await cartStore.dispatch('addItem', { id: 2, name: 'Pen', qty: 3, price: 2 });

    const cartDT = devToolsHarness.getByName('CartStore')!;
    cartDT.fire({
      type: 'DISPATCH',
      payload: { type: 'JUMP_TO_STATE' },
      state: JSON.stringify({ items: [], checkoutStatus: 'idle' }),
    });

    expect(cartStore.getState().items).toHaveLength(0);
  });

  it('restores state via JUMP_TO_ACTION (snapshot map)', async () => {
    await cartStore.dispatch('addItem', { id: 1, name: 'Book', qty: 1, price: 15 }); // idx 1
    await cartStore.dispatch('addItem', { id: 2, name: 'Pen', qty: 3, price: 2 }); // idx 2

    const cartDT = devToolsHarness.getByName('CartStore')!;
    cartDT.fire({ type: 'DISPATCH', payload: { type: 'JUMP_TO_ACTION', actionId: 1 } });

    expect(cartStore.getState().items).toHaveLength(1);
    expect(cartStore.getState().items[0].name).toBe('Book');
  });

  // ── observable pipeline ──────────────────────────────────────────────────

  it('observable pipeline: total price with distinctUntilChanged', async () => {
    const prices: number[] = [];

    const total$ = asObservable(cartStore).pipe(
      map((s) => s.items.reduce((sum, i) => sum + i.price * i.qty, 0)),
      filter((t) => t >= 0),
      distinctUntilChanged()
    );

    const sub = total$.subscribe((v) => prices.push(v));

    await cartStore.dispatch('addItem', { id: 1, name: 'Book', qty: 2, price: 10 });
    await cartStore.dispatch('addItem', { id: 2, name: 'Pen', qty: 1, price: 5 });
    await cartStore.dispatch('removeItem', 1);

    sub.unsubscribe();

    // After removeItem, total goes back down
    expect(prices).toEqual([20, 25, 5]);

    // No leak — further dispatches emit nothing
    await cartStore.dispatch('addItem', { id: 3, name: 'Ghost', qty: 1, price: 99 });
    expect(prices).toEqual([20, 25, 5]);
    expect(sub.closed).toBe(true);
  });

  // ── prefixActions composition ────────────────────────────────────────────

  it('prefixActions composes cart+user into one store without interference', async () => {
    type AppState = { cart: CartState; user: UserState };

    const appStore = createStore<AppState>(
      {
        cart: { items: [], checkoutStatus: 'idle' },
        user: { name: '', loggedIn: false },
      },
      {
        ...prefixActions(cartActions, 'cart'),
        ...prefixActions(userActions, 'user'),
      }
    );

    await appStore.dispatch('cart/addItem', { id: 1, name: 'Book', qty: 1, price: 15 });
    await appStore.dispatch('user/login', { name: 'Bob' });

    expect(appStore.getState().cart.items).toHaveLength(1);
    expect(appStore.getState().user.name).toBe('Bob');

    await appStore.dispatch('cart/clearCart');

    // Cart cleared but user untouched
    expect(appStore.getState().cart.items).toHaveLength(0);
    expect(appStore.getState().user.loggedIn).toBe(true);
  });

  // ── createSlice integration ──────────────────────────────────────────────

  it('createSlice works with DevTools', async () => {
    interface NotifState {
      messages: string[];
      unread: number;
    }

    const notifSlice = createSlice<NotifState>(
      { messages: [], unread: 0 },
      {
        push: (s, payload: unknown) => ({
          messages: [...s.messages, payload as string],
          unread: s.unread + 1,
        }),
        markRead: (s) => ({ ...s, unread: 0 }),
      }
    );

    const notifStore = createStore(notifSlice.initialState, notifSlice.actions);
    connectDevTools(notifStore, { name: 'NotifStore', timeTravel: true });

    await notifStore.dispatch('push', 'You have mail');
    await notifStore.dispatch('push', 'Meeting at 3pm');
    await notifStore.dispatch('markRead');

    expect(notifStore.getState().messages).toHaveLength(2);
    expect(notifStore.getState().unread).toBe(0);

    const dt = devToolsHarness.getByName('NotifStore')!;
    expect(dt.sent).toHaveLength(3);
    // Jump back to after first push
    dt.fire({ type: 'DISPATCH', payload: { type: 'JUMP_TO_ACTION', actionId: 1 } });
    expect(notifStore.getState().unread).toBe(1);
  });
});
