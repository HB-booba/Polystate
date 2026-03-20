import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, Store } from './store';

describe('Store', () => {
  interface TestState {
    count: number;
    name: string;
  }

  let store: Store<TestState>;

  beforeEach(() => {
    store = createStore<TestState>(
      { count: 0, name: 'Test' },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
        decrement: (state) => ({ ...state, count: state.count - 1 }),
        setName: (state, name: string) => ({ ...state, name }),
        incrementByAmount: (state, amount: number) => ({
          ...state,
          count: state.count + amount,
        }),
      }
    );
  });

  it('should initialize with initial state', () => {
    expect(store.getState()).toEqual({ count: 0, name: 'Test' });
  });

  it('should get state with selector', () => {
    const count = store.getState((state) => state.count);
    expect(count).toBe(0);
  });

  it('should dispatch actions and update state', async () => {
    await store.dispatch('increment');
    expect(store.getState().count).toBe(1);

    await store.dispatch('decrement');
    expect(store.getState().count).toBe(0);
  });

  it('should dispatch actions with payload', async () => {
    await store.dispatch('setName', 'Alice');
    expect(store.getState().name).toBe('Alice');

    await store.dispatch('incrementByAmount', 5);
    expect(store.getState().count).toBe(5);
  });

  it('should support setState', () => {
    store.setState({ count: 10 });
    expect(store.getState()).toEqual({ count: 10, name: 'Test' });

    store.setState({ name: 'Updated' });
    expect(store.getState()).toEqual({ count: 10, name: 'Updated' });
  });

  it('should notify global subscribers', async () => {
    const listener = vi.fn();
    store.subscribe(listener);

    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledWith({ count: 1, name: 'Test' });
  });

  it('should support selective subscription', async () => {
    const listener = vi.fn();
    store.subscribe((state) => state.count, listener);

    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('should not notify selective subscribers if value did not change', async () => {
    const listener = vi.fn();
    store.subscribe((state) => state.name, listener);

    await store.dispatch('increment');
    expect(listener).not.toHaveBeenCalled();
  });

  it('should unsubscribe correctly', async () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should support thunk actions', async () => {
    await store.dispatch(async (dispatch, getState) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      const state = getState();
      expect(state.count).toBe(0);
      dispatch('increment');
    });
    expect(store.getState().count).toBe(1);
  });

  it('should warn if action not found', async () => {
    const warnSpy = vi.spyOn(console, 'warn');

    await store.dispatch('nonexistent');
    expect(warnSpy).toHaveBeenCalledWith('No action handler found for "nonexistent"');
    warnSpy.mockRestore();
  });

  it('should run middleware', async () => {
    const middlewareFn = vi.fn();
    const storeWithMiddleware = createStore<TestState>(
      { count: 0, name: 'Test' },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
      },
      {
        middleware: [middlewareFn],
      }
    );

    await storeWithMiddleware.dispatch('increment');
    expect(middlewareFn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'increment',
        prevState: { count: 0, name: 'Test' },
        nextState: { count: 1, name: 'Test' },
      })
    );
  });

  it('should support multiple subscribers', async () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    store.subscribe(listener1);
    store.subscribe(listener2);

    await store.dispatch('increment');
    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  it('should support complex nested state', async () => {
    interface ComplexState {
      user: {
        name: string;
        profile: {
          age: number;
        };
      };
    }

    const complexStore = createStore<ComplexState>(
      {
        user: {
          name: 'John',
          profile: {
            age: 30,
          },
        },
      },
      {
        updateAge: (state, age: number) => ({
          ...state,
          user: {
            ...state.user,
            profile: {
              ...state.user.profile,
              age,
            },
          },
        }),
      }
    );

    const listener = vi.fn();
    complexStore.subscribe((state) => state.user.profile.age, listener);

    await complexStore.dispatch('updateAge', 31);
    expect(listener).toHaveBeenCalledWith(31);
  });
});
