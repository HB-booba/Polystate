/**
 * Simple counter example — verifies basic store lifecycle and subscription cleanup.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asObservable, createStore, distinctUntilChanged, map } from '@polystate/core';
import type { ActionMap } from '@polystate/core';

interface CounterState {
  count: number;
  label: string;
}

const initialState: CounterState = { count: 0, label: 'Counter' };

const actions: ActionMap<CounterState> = {
  increment: (state: CounterState) => ({ ...state, count: state.count + 1 }),
  decrement: (state: CounterState) => ({ ...state, count: state.count - 1 }),
  reset: (state: CounterState) => ({ ...state, count: 0 }),
  setLabel: (state: CounterState, payload: unknown) => ({ ...state, label: payload as string }),
};

describe('Simple counter example', () => {
  let store: ReturnType<typeof createStore<CounterState>>;

  beforeEach(() => {
    store = createStore(initialState, actions);
  });

  it('should start with initial state', () => {
    expect(store.getState()).toEqual(initialState);
  });

  it('should dispatch increment', async () => {
    await store.dispatch('increment');
    expect(store.getState().count).toBe(1);
  });

  it('should dispatch decrement', async () => {
    await store.dispatch('increment');
    await store.dispatch('increment');
    await store.dispatch('decrement');
    expect(store.getState().count).toBe(1);
  });

  it('should reset to 0', async () => {
    await store.dispatch('increment');
    await store.dispatch('increment');
    await store.dispatch('reset');
    expect(store.getState().count).toBe(0);
  });

  it('should set label', async () => {
    await store.dispatch('setLabel', 'My Counter');
    expect(store.getState().label).toBe('My Counter');
  });

  describe('subscription cleanup', () => {
    it('should notify subscriber on state change', async () => {
      const listener = vi.fn();
      const unsub = store.subscribe(listener);

      await store.dispatch('increment');
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      await store.dispatch('increment');
      // No more calls after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should not leak selective subscribers after unsubscribe', async () => {
      const listener = vi.fn();
      const unsub = store.subscribe((s: CounterState) => s.count, listener);

      await store.dispatch('increment');
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      await store.dispatch('increment');
      // Should NOT fire again after cleanup
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should not notify selective subscriber when unrelated key changes', async () => {
      const countListener = vi.fn();
      const unsub = store.subscribe((s: CounterState) => s.count, countListener);

      await store.dispatch('setLabel', 'changed');
      expect(countListener).not.toHaveBeenCalled();

      unsub();
    });
  });

  describe('observable cleanup', () => {
    it('should complete observable subscription lifecycle', async () => {
      const obs$ = asObservable(store).pipe(map((s) => s.count));
      const received: number[] = [];

      const sub = obs$.subscribe((v) => received.push(v));
      expect(sub.closed).toBe(false);

      await store.dispatch('increment');
      await store.dispatch('increment');

      expect(received).toEqual([1, 2]);

      sub.unsubscribe();
      expect(sub.closed).toBe(true);

      await store.dispatch('increment');
      // No more values after unsubscribe
      expect(received).toEqual([1, 2]);
    });

    it('distinctUntilChanged should not re-emit same value', async () => {
      const obs$ = asObservable(store, (s: CounterState) => s.label).pipe(distinctUntilChanged());
      const received: string[] = [];
      const sub = obs$.subscribe((v) => received.push(v));

      // The observable only fires on changes — it does NOT replay current state on subscribe.
      // label == 'Counter' already; dispatching same value produces no change event.
      await store.dispatch('setLabel', 'Counter'); // same — no emit
      await store.dispatch('setLabel', 'New'); // different — emit (first emission seeds prev)
      await store.dispatch('setLabel', 'New'); // same — no emit
      await store.dispatch('setLabel', 'Final'); // different — emit

      sub.unsubscribe();

      expect(received).toEqual(['New', 'Final']);
    });
  });
});
