/**
 * Simple counter example WITH DevTools middleware.
 *
 * Run: node --experimental-vm-modules examples/usage/simple-with-devtools.mjs
 *
 * In a browser environment the Redux DevTools Extension will pick up
 * every dispatched action and allow full time-travel.
 *
 * HOW TO USE DEVTOOLS:
 *  1. Install "Redux DevTools" extension in Chrome/Firefox.
 *  2. Open this script in any webpage that has window.__REDUX_DEVTOOLS_EXTENSION__.
 *  3. Or run the React/Angular examples in the browser and open the DevTools panel.
 *
 * This test simulates the DevTools bridge in a Node.js environment
 * using a manual mock, so it runs in Vitest too.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStore, loggerMiddleware } from '@polystate/core';
import type { ActionMap } from '@polystate/core';
import { connectDevTools } from '@polystate/devtools';

// ── State ──────────────────────────────────────────────────────────────────
interface CounterState {
  count: number;
  step: number;
}

const actions: ActionMap<CounterState> = {
  increment: (s) => ({ ...s, count: s.count + s.step }),
  decrement: (s) => ({ ...s, count: s.count - s.step }),
  setStep: (s, payload: unknown) => ({ ...s, step: payload as number }),
  reset: () => ({ count: 0, step: 1 }),
};

// ── DevTools mock helpers ─────────────────────────────────────────────────
type DevToolsMessage = { type: string; payload?: { type: string; actionId?: number }; state?: string };

function mockDevTools() {
  let timeTravelCb: ((msg: DevToolsMessage) => void) | null = null;

  const extension = {
    _sent: [] as Array<{ action: unknown; state: unknown }>,
    _initState: null as unknown,
    send(action: unknown, state: unknown) {
      this._sent.push({ action, state });
    },
    init(state: unknown) {
      this._initState = state;
    },
    subscribe(cb: (msg: DevToolsMessage) => void) {
      timeTravelCb = cb;
      return () => { timeTravelCb = null; };
    },
    /** Test helper — simulate a DevTools JUMP_TO_STATE command */
    simulateJump(state: unknown) {
      timeTravelCb?.({ type: 'DISPATCH', payload: { type: 'JUMP_TO_STATE' }, state: JSON.stringify(state) });
    },
    /** Test helper — simulate a DevTools JUMP_TO_ACTION command */
    simulateJumpToAction(actionId: number) {
      timeTravelCb?.({ type: 'DISPATCH', payload: { type: 'JUMP_TO_ACTION', actionId } });
    },
  };

  type WinWithDevTools = typeof window & { __REDUX_DEVTOOLS_EXTENSION__?: unknown };
  const win = window as WinWithDevTools;
  const original = win.__REDUX_DEVTOOLS_EXTENSION__;
  win.__REDUX_DEVTOOLS_EXTENSION__ = () => extension;

  return {
    extension,
    restore: () => { win.__REDUX_DEVTOOLS_EXTENSION__ = original; },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────
describe('Simple counter with DevTools', () => {
  let store: ReturnType<typeof createStore<CounterState>>;
  let devTools: ReturnType<typeof mockDevTools>;

  beforeEach(() => {
    devTools = mockDevTools();
    const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleSpy; // suppress unused warning

    store = createStore({ count: 0, step: 1 }, actions, {
      middleware: [loggerMiddleware()],
    });

    // Wire up DevTools — connectDevTools wraps the store,
    // calls init() with current state, and registers a time-travel listener.
    connectDevTools(store, { name: 'CounterStore', timeTravel: true });
  });

  afterEach(() => {
    devTools.restore();
    vi.restoreAllMocks();
  });

  it('initialises DevTools with current state', () => {
    expect(devTools.extension._initState).toEqual({ count: 0, step: 1 });
  });

  it('sends each action to DevTools', async () => {
    await store.dispatch('increment');
    await store.dispatch('increment');
    await store.dispatch('setStep', 5);
    await store.dispatch('increment');

    expect(devTools.extension._sent).toHaveLength(4);
    expect((devTools.extension._sent[0].action as { type: string }).type).toBe('increment');
    expect((devTools.extension._sent[2].action as { type: string }).type).toBe('setStep');
  });

  it('time-travels via JUMP_TO_STATE', async () => {
    await store.dispatch('increment'); // count=1
    await store.dispatch('increment'); // count=2
    await store.dispatch('increment'); // count=3

    // Jump back to count=1
    devTools.extension.simulateJump({ count: 1, step: 1 });
    expect(store.getState().count).toBe(1);

    // Continue from there
    await store.dispatch('increment');
    expect(store.getState().count).toBe(2);
  });

  it('time-travels via JUMP_TO_ACTION', async () => {
    await store.dispatch('increment'); // action index 1 → count=1
    await store.dispatch('increment'); // action index 2 → count=2
    await store.dispatch('setStep', 10); // action index 3 → step=10

    // Jump back to after the first increment (actionId=1 → count=1, step=1)
    devTools.extension.simulateJumpToAction(1);
    expect(store.getState().count).toBe(1);
    expect(store.getState().step).toBe(1);
  });

  it('notifies subscribers even after a time-travel reset', async () => {
    const history: number[] = [];
    const unsub = store.subscribe((s) => history.push(s.count));

    await store.dispatch('increment'); // 1
    await store.dispatch('increment'); // 2

    devTools.extension.simulateJump({ count: 0, step: 1 });
    // setState triggers global subscribers
    expect(history[history.length - 1]).toBe(0);

    unsub();
  });
});
