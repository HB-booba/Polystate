import { describe, expect, it, vi } from 'vitest';
import { asObservable, distinctUntilChanged, filter, map, take } from './observable';
import { createStore } from './store';

describe('Observable', () => {
  it('should create an observable from a store', async () => {
    const store = createStore(
      { count: 0 },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
      }
    );

    const observable$ = asObservable(store);
    const listener = vi.fn();

    observable$.subscribe(listener);
    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledWith({ count: 1 });
  });

  it('should create an observable with selector', async () => {
    const store = createStore(
      { count: 0, name: 'Test' },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
      }
    );

    const count$ = asObservable(store, (state) => state.count);
    const listener = vi.fn();

    count$.subscribe(listener);
    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('should support map operator', async () => {
    const store = createStore(
      { count: 0 },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
      }
    );

    const observable$ = asObservable(store);
    const mapped$ = observable$.pipe(map((state) => state.count * 2));

    const listener = vi.fn();
    mapped$.subscribe(listener);

    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledWith(2);
  });

  it('should support filter operator', async () => {
    const store = createStore(
      { count: 0 },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
      }
    );

    const observable$ = asObservable(store);
    const filtered$ = observable$.pipe(
      map((state) => state.count),
      filter((count) => count > 0)
    );

    const listener = vi.fn();
    filtered$.subscribe(listener);

    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('should support distinctUntilChanged operator', async () => {
    const store = createStore(
      { count: 0, other: 'test' },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
        updateOther: (state) => ({ ...state, other: 'changed' }),
      }
    );

    const count$ = asObservable(store, (state) => state.count);
    const distinct$ = count$.pipe(distinctUntilChanged());

    const listener = vi.fn();
    distinct$.subscribe(listener);

    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);

    // Emitting without changing the count should not trigger listener
    await store.dispatch('updateOther');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should support take operator', async () => {
    const store = createStore(
      { count: 0 },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
      }
    );

    const observable$ = asObservable(store);
    const take2$ = observable$.pipe(take(2));

    const listener = vi.fn();
    const subscription = take2$.subscribe(listener);

    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledTimes(1);
    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(subscription.closed).toBe(true);
  });

  it('should unsubscribe correctly', async () => {
    const store = createStore(
      { count: 0 },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
      }
    );

    const observable$ = asObservable(store);
    const listener = vi.fn();
    const subscription = observable$.subscribe(listener);

    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledTimes(1);

    subscription.unsubscribe();
    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(subscription.closed).toBe(true);
  });

  it('should support callback subscription pattern', async () => {
    const store = createStore(
      { count: 0 },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
      }
    );

    const observable$ = asObservable(store);
    const listener = vi.fn();

    observable$.subscribe(listener);

    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledWith({ count: 1 });
  });

  describe('distinctUntilChanged', () => {
    it('should always emit the first value', async () => {
      const store = createStore(
        { count: 0 },
        {
          setCount: (state, n: number) => ({ ...state, count: n }),
        }
      );

      const distinct$ = asObservable(store, (s) => s.count).pipe(distinctUntilChanged());

      const listener = vi.fn();
      distinct$.subscribe(listener);

      // First dispatch: value changes from initial 0 → 1, must be emitted
      await store.dispatch('setCount', 1);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(1);
    });

    it('should suppress identical consecutive values', async () => {
      const store = createStore(
        { count: 0, tag: 'a' },
        {
          setCount: (state, n: number) => ({ ...state, count: n }),
          setTag: (state, t: string) => ({ ...state, tag: t }),
        }
      );

      const distinct$ = asObservable(store, (s) => s.count).pipe(distinctUntilChanged());

      const listener = vi.fn();
      distinct$.subscribe(listener);

      await store.dispatch('setCount', 5); // count: 0 → 5, emit
      await store.dispatch('setTag', 'b'); // count unchanged, suppress
      await store.dispatch('setTag', 'c'); // count unchanged, suppress
      await store.dispatch('setCount', 5); // same value 5 → 5, suppress
      await store.dispatch('setCount', 6); // count: 5 → 6, emit
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, 5);
      expect(listener).toHaveBeenNthCalledWith(2, 6);
    });

    it('should use custom comparator when provided', async () => {
      const store = createStore(
        { value: 1 },
        {
          setValue: (state, n: number) => ({ ...state, value: n }),
        }
      );

      // Treat all even numbers as equal to each other
      const distinct$ = asObservable(store, (s) => s.value).pipe(
        distinctUntilChanged((a, b) => a % 2 === b % 2)
      );

      const listener = vi.fn();
      distinct$.subscribe(listener);

      await store.dispatch('setValue', 3); // odd → odd (same parity), suppress
      await store.dispatch('setValue', 2); // odd → even, emit
      await store.dispatch('setValue', 4); // even → even, suppress
      await store.dispatch('setValue', 7); // even → odd, emit
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, 2);
      expect(listener).toHaveBeenNthCalledWith(2, 7);
    });

    it('each subscription has independent state', async () => {
      const store = createStore(
        { count: 0 },
        {
          setCount: (state, n: number) => ({ ...state, count: n }),
        }
      );

      const source$ = asObservable(store, (s) => s.count).pipe(distinctUntilChanged());

      const listenerA = vi.fn();
      const listenerB = vi.fn();
      source$.subscribe(listenerA);
      source$.subscribe(listenerB);

      await store.dispatch('setCount', 1);
      await store.dispatch('setCount', 1); // suppress for both
      await store.dispatch('setCount', 2); // emit for both
      expect(listenerA).toHaveBeenCalledTimes(2);
      expect(listenerB).toHaveBeenCalledTimes(2);
    });
  });

  it('should chain multiple operators', async () => {
    const store = createStore(
      { count: 0 },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
      }
    );

    const observable$ = asObservable(store).pipe(
      map((state) => state.count),
      filter((count) => count > 0),
      map((count) => count * 2),
      distinctUntilChanged()
    );

    const listener = vi.fn();
    observable$.subscribe(listener);

    await store.dispatch('increment');
    expect(listener).toHaveBeenCalledWith(2);
  });
});
