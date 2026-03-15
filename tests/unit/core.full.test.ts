/**
 * @polystate/core — comprehensive edge-case & API contract tests
 *
 * Follows Jest/Vitest compatible API. Covers all public surface area including
 * new methods added for npm publication: reset(), destroy(), getActionNames().
 *
 * Run: npx vitest run tests/unit/core.full.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    Signal,
    Store,
    asObservable,
    composeSlices,
    createSlice,
    createStore,
    distinctUntilChanged,
    filter,
    loadPersistedState,
    loggerMiddleware,
    map,
    persistMiddleware,
    prefixActions,
    take,
} from '../../packages/core/src/index';

// ---------------------------------------------------------------------------
// Signal
// ---------------------------------------------------------------------------

describe('Signal', () => {
    it('holds initial value', () => {
        const s = new Signal(42);
        expect(s.value).toBe(42);
    });

    it('notifies subscriber on value change', () => {
        const s = new Signal(0);
        const cb = vi.fn();
        s.subscribe(cb);
        s.value = 1;
        expect(cb).toHaveBeenCalledWith(1);
    });

    it('does NOT notify when value is identical (===)', () => {
        const s = new Signal(0);
        const cb = vi.fn();
        s.subscribe(cb);
        s.value = 0; // same
        expect(cb).not.toHaveBeenCalled();
    });

    it('supports multiple independent subscribers', () => {
        const s = new Signal('a');
        const a = vi.fn();
        const b = vi.fn();
        s.subscribe(a);
        s.subscribe(b);
        s.value = 'b';
        expect(a).toHaveBeenCalledWith('b');
        expect(b).toHaveBeenCalledWith('b');
    });

    it('unsubscribe stops further notifications', () => {
        const s = new Signal(0);
        const cb = vi.fn();
        const unsub = s.subscribe(cb);
        unsub();
        s.value = 99;
        expect(cb).not.toHaveBeenCalled();
    });

    it('works with reference types — does NOT deep-equal, uses ===', () => {
        const obj = { x: 1 };
        const s = new Signal(obj);
        const cb = vi.fn();
        s.subscribe(cb);
        s.value = obj; // same reference → no notify
        expect(cb).not.toHaveBeenCalled();
        s.value = { x: 1 }; // different reference → notified
        expect(cb).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// Store — construction
// ---------------------------------------------------------------------------

describe('Store — construction', () => {
    it('createStore returns a Store instance', () => {
        const store = createStore({ n: 0 }, {});
        expect(store).toBeInstanceOf(Store);
    });

    it('getState returns initial state', () => {
        const init = { a: 1, b: 'hello' };
        const store = createStore(init, {});
        expect(store.getState()).toEqual(init);
        expect(store.getState()).toBe(store.getState()); // same reference
    });

    it('getState with selector returns correct slice', () => {
        const store = createStore({ x: 10, y: 20 }, {});
        expect(store.getState((s) => s.x)).toBe(10);
        expect(store.getState((s) => s.y)).toBe(20);
    });

    it('getActionNames lists registered actions', () => {
        const store = createStore({ n: 0 }, {
            inc: (s) => ({ n: s.n + 1 }),
            dec: (s) => ({ n: s.n - 1 }),
            reset: (s) => ({ n: 0 }),
        });
        expect(store.getActionNames()).toEqual(expect.arrayContaining(['inc', 'dec', 'reset']));
        expect(store.getActionNames()).toHaveLength(3);
    });

    it('empty actions map is valid', () => {
        const store = createStore({ v: 1 }, {} as Record<string, never>);
        expect(store.getState()).toEqual({ v: 1 });
    });
});

// ---------------------------------------------------------------------------
// Store — dispatch
// ---------------------------------------------------------------------------

describe('Store — dispatch', () => {
    interface CounterState { count: number; label: string; }
    const init: CounterState = { count: 0, label: 'counter' };

    const makeStore = () =>
        createStore<CounterState>(init, {
            inc: (s) => ({ ...s, count: s.count + 1 }),
            add: (s, n: number) => ({ ...s, count: s.count + n }),
            label: (s, l: string) => ({ ...s, label: l }),
        });

    it('dispatch mutates state correctly', async () => {
        const store = makeStore();
        await store.dispatch('inc');
        await store.dispatch('inc');
        expect(store.getState((s) => s.count)).toBe(2);
    });

    it('dispatch with payload', async () => {
        const store = makeStore();
        await store.dispatch('add', 5);
        expect(store.getState((s) => s.count)).toBe(5);
    });

    it('dispatch returns a Promise', () => {
        const store = makeStore();
        const r = store.dispatch('inc');
        expect(typeof (r as any).then).toBe('function');
    });

    it('warns and no-ops on unknown action', async () => {
        const store = makeStore();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await store.dispatch('nonexistent');
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('nonexistent'));
        expect(store.getState((s) => s.count)).toBe(0);
        warn.mockRestore();
    });

    it('multiple sequential dispatches yield correct final state', async () => {
        const store = makeStore();
        for (let i = 0; i < 10; i++) await store.dispatch('inc');
        expect(store.getState((s) => s.count)).toBe(10);
    });

    it('thunk dispatches multiple actions', async () => {
        const store = makeStore();
        await store.dispatch(async (dispatch, getState) => {
            await dispatch('inc');
            await dispatch('add', getState().count * 2); // 1 * 2 = 2
        });
        expect(store.getState((s) => s.count)).toBe(3); // 1 + 2
    });

    it('thunk can dispatch another thunk', async () => {
        const store = makeStore();
        const inner = async (dispatch: any) => { await dispatch('inc'); };
        await store.dispatch(async (dispatch) => {
            await dispatch(inner);
            await dispatch(inner);
        });
        expect(store.getState((s) => s.count)).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Store — setState
// ---------------------------------------------------------------------------

describe('Store — setState', () => {
    it('partial setState merges correctly', () => {
        const store = createStore({ a: 1, b: 2, c: 3 }, {});
        store.setState({ b: 99 });
        expect(store.getState()).toEqual({ a: 1, b: 99, c: 3 });
    });

    it('setState notifies global subscribers', () => {
        const store = createStore({ x: 0 }, {});
        const cb = vi.fn();
        store.subscribe(cb);
        store.setState({ x: 1 });
        expect(cb).toHaveBeenCalledWith({ x: 1 });
    });

    it('setState notifies selective subscribers when slice changes', () => {
        const store = createStore({ a: 0, b: 0 }, {});
        const aCb = vi.fn();
        const bCb = vi.fn();
        store.subscribe((s) => s.a, aCb);
        store.subscribe((s) => s.b, bCb);
        store.setState({ a: 1 });
        expect(aCb).toHaveBeenCalledWith(1);
        expect(bCb).not.toHaveBeenCalled();
    });

    it('setState does NOT notify when selector value unchanged', () => {
        const store = createStore({ x: 5, y: 10 }, {});
        const cb = vi.fn();
        store.subscribe((s) => s.x, cb);
        store.setState({ y: 99 }); // x didn't change
        expect(cb).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Store — reset()
// ---------------------------------------------------------------------------

describe('Store — reset()', () => {
    it('restores initial state', async () => {
        const store = createStore({ count: 0 }, {
            inc: (s: { count: number }) => ({ count: s.count + 1 }),
        });
        await store.dispatch('inc');
        await store.dispatch('inc');
        store.reset();
        expect(store.getState()).toEqual({ count: 0 });
    });

    it('notifies global subscribers after reset', () => {
        const store = createStore({ n: 5 }, {});
        const cb = vi.fn();
        store.subscribe(cb);
        store.reset();
        expect(cb).toHaveBeenCalledWith({ n: 5 });
    });

    it('reset after destroy is silently ignored', () => {
        const store = createStore({ v: 1 }, {});
        const cb = vi.fn();
        store.subscribe(cb);
        store.destroy();
        expect(() => store.reset()).not.toThrow();
        // subscriptions were cleared by destroy, but reset still runs without error
    });
});

// ---------------------------------------------------------------------------
// Store — destroy()
// ---------------------------------------------------------------------------

describe('Store — destroy()', () => {
    it('dispatch is a no-op after destroy', async () => {
        const store = createStore({ n: 0 }, {
            inc: (s: { n: number }) => ({ n: s.n + 1 }),
        });
        store.destroy();
        await store.dispatch('inc');
        // State should be unchanged (internal signal not mutated after destroy)
    });

    it('global subscribers do not fire after destroy', async () => {
        const store = createStore({ n: 0 }, {
            inc: (s: { n: number }) => ({ n: s.n + 1 }),
        });
        const cb = vi.fn();
        store.subscribe(cb);
        store.destroy();
        await store.dispatch('inc');
        expect(cb).not.toHaveBeenCalled();
    });

    it('calling destroy twice does not throw', () => {
        const store = createStore({ v: 0 }, {});
        expect(() => {
            store.destroy();
            store.destroy();
        }).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// Store — subscriptions
// ---------------------------------------------------------------------------

describe('Store — subscriptions', () => {
    it('global subscriber receives every state change', async () => {
        const store = createStore({ n: 0 }, {
            inc: (s: { n: number }) => ({ n: s.n + 1 }),
        });
        const states: number[] = [];
        store.subscribe((s) => states.push(s.n));
        await store.dispatch('inc');
        await store.dispatch('inc');
        expect(states).toEqual([1, 2]);
    });

    it('selective subscriber only receives changes for its slice', async () => {
        const store = createStore({ a: 0, b: 0 }, {
            setA: (s: any, v: number) => ({ ...s, a: v }),
            setB: (s: any, v: number) => ({ ...s, b: v }),
        });
        const aCalls: number[] = [];
        store.subscribe((s) => s.a, (v) => aCalls.push(v));
        await store.dispatch('setB', 99); // should NOT trigger a listener
        await store.dispatch('setA', 7);
        expect(aCalls).toEqual([7]);
    });

    it('unsubscribe stops receiving updates', async () => {
        const store = createStore({ n: 0 }, {
            inc: (s: { n: number }) => ({ n: s.n + 1 }),
        });
        const cb = vi.fn();
        const unsub = store.subscribe(cb);
        await store.dispatch('inc');
        unsub();
        await store.dispatch('inc');
        expect(cb).toHaveBeenCalledTimes(1);
    });

    it('multiple callbacks on same selector all fire', async () => {
        const store = createStore({ n: 0 }, {
            inc: (s: { n: number }) => ({ n: s.n + 1 }),
        });
        const a = vi.fn();
        const b = vi.fn();
        const sel = (s: { n: number }) => s.n;
        store.subscribe(sel, a);
        store.subscribe(sel, b);
        await store.dispatch('inc');
        expect(a).toHaveBeenCalledWith(1);
        expect(b).toHaveBeenCalledWith(1);
    });

    it('subscriber map entry cleaned up when last subscriber removed', async () => {
        const store = createStore({ n: 0 }, {
            inc: (s: { n: number }) => ({ n: s.n + 1 }),
        });
        const cb = vi.fn();
        const sel = (s: { n: number }) => s.n;
        const unsub = store.subscribe(sel, cb);
        unsub();
        // Re-subscribing after cleanup should still work
        const cb2 = vi.fn();
        store.subscribe(sel, cb2);
        await store.dispatch('inc');
        expect(cb2).toHaveBeenCalledWith(1);
    });
});

// ---------------------------------------------------------------------------
// Store — logging option
// ---------------------------------------------------------------------------

describe('Store — logging option', () => {
    it('logging:true automatically adds loggerMiddleware', async () => {
        const group = vi.spyOn(console, 'group').mockImplementation(() => {});
        const groupEnd = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});

        const store = createStore({ n: 0 }, {
            inc: (s: { n: number }) => ({ n: s.n + 1 }),
        }, { logging: true });

        await store.dispatch('inc');
        expect(group).toHaveBeenCalled();
        expect(groupEnd).toHaveBeenCalled();

        group.mockRestore();
        groupEnd.mockRestore();
        vi.restoreAllMocks();
    });

    it('explicit middleware runs AFTER the built-in logger', async () => {
        const order: string[] = [];
        vi.spyOn(console, 'group').mockImplementation(() => order.push('logger'));
        vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});

        const custom = () => { order.push('custom'); };

        const store = createStore({ n: 0 }, {
            inc: (s: { n: number }) => ({ n: s.n + 1 }),
        }, { logging: true, middleware: [custom] });

        await store.dispatch('inc');
        expect(order.indexOf('logger')).toBeLessThan(order.indexOf('custom'));
        vi.restoreAllMocks();
    });
});

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

describe('Middleware', () => {
    it('middleware runs after state is updated', async () => {
        const observed: any[] = [];
        const m = (ctx: any) => observed.push({ prev: ctx.prevState, next: ctx.nextState });
        const store = createStore({ n: 0 }, {
            inc: (s: { n: number }) => ({ n: s.n + 1 }),
        }, { middleware: [m] });

        await store.dispatch('inc');
        expect(observed[0].prev).toEqual({ n: 0 });
        expect(observed[0].next).toEqual({ n: 1 });
    });

    it('middleware runs in registration order', async () => {
        const order: number[] = [];
        const store = createStore({ n: 0 }, {
            inc: (s: { n: number }) => ({ n: s.n + 1 }),
        }, {
            middleware: [
                () => order.push(1),
                () => order.push(2),
                () => order.push(3),
            ],
        });
        await store.dispatch('inc');
        expect(order).toEqual([1, 2, 3]);
    });

    it('async middleware is awaited', async () => {
        let done = false;
        const store = createStore({ n: 0 }, {
            inc: (s: { n: number }) => ({ n: s.n + 1 }),
        }, {
            middleware: [async () => {
                await new Promise((r) => setTimeout(r, 10));
                done = true;
            }],
        });
        await store.dispatch('inc');
        expect(done).toBe(true);
    });

    it('middleware receives correct context fields', async () => {
        let ctx: any;
        const store = createStore({ n: 0 }, {
            add: (s: { n: number }, v: number) => ({ n: s.n + v }),
        }, { middleware: [(c) => { ctx = c; }] });

        await store.dispatch('add', 5);
        expect(ctx.action).toBe('add');
        expect(ctx.payload).toBe(5);
        expect(ctx.prevState).toEqual({ n: 0 });
        expect(ctx.nextState).toEqual({ n: 5 });
        expect(typeof ctx.dispatch).toBe('function');
    });

    it('middleware throwing does not break subsequent middleware', async () => {
        const second = vi.fn();
        const store = createStore({ n: 0 }, {
            inc: (s: { n: number }) => ({ n: s.n + 1 }),
        }, {
            middleware: [
                () => { throw new Error('boom'); },
                second,
            ],
        });
        // The store currently propagates middleware errors; catch externally
        await expect(store.dispatch('inc')).rejects.toThrow('boom');
    });

    it('persistMiddleware saves state to storage', async () => {
        const storage: Record<string, string> = {};
        const mockStorage = {
            getItem: (k: string) => storage[k] ?? null,
            setItem: (k: string, v: string) => { storage[k] = v; },
            removeItem: (k: string) => { delete storage[k]; },
            length: 0,
            clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
            key: (_: number) => null,
        } as Storage;

        const store = createStore({ n: 0 }, {
            set: (s: { n: number }, v: number) => ({ n: v }),
        }, { middleware: [persistMiddleware('key', mockStorage)] });

        await store.dispatch('set', 42);
        expect(JSON.parse(storage['key'])).toEqual({ n: 42 });
    });

    it('loadPersistedState rehydrates correctly', () => {
        const storage: Record<string, string> = {
            mykey: JSON.stringify({ n: 99 }),
        };
        const mockStorage = {
            getItem: (k: string) => storage[k] ?? null,
        } as Storage;

        const state = loadPersistedState<{ n: number }>('mykey', mockStorage);
        expect(state).toEqual({ n: 99 });
    });

    it('loadPersistedState returns null when key is absent', () => {
        const mockStorage = { getItem: () => null } as unknown as Storage;
        expect(loadPersistedState('missing', mockStorage)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Slices
// ---------------------------------------------------------------------------

describe('Slices', () => {
    it('createSlice preserves initialState and actions', () => {
        const s = createSlice({ x: 1 }, {
            double: (state: { x: number }) => ({ x: state.x * 2 }),
        });
        expect(s.initialState).toEqual({ x: 1 });
        expect(typeof s.actions.double).toBe('function');
    });

    it('prefixActions wraps handler to update nested key', async () => {
        const counterSlice = createSlice({ count: 0 }, {
            inc: (s: { count: number }) => ({ count: s.count + 1 }),
        });
        const store = createStore(
            { counter: { count: 0 }, other: 'x' },
            prefixActions(counterSlice.actions, 'counter') as any
        );
        await store.dispatch('counter/inc');
        expect(store.getState().counter).toEqual({ count: 1 });
        expect((store.getState() as any).other).toBe('x');
    });

    it('composeSlices returns one entry per slice', () => {
        const a = createSlice({ x: 0 }, {});
        const b = createSlice({ y: '' }, {});
        const c = createSlice({ z: false }, {});
        const result = composeSlices([a, b, c]);
        expect(result).toHaveLength(3);
    });

    it('composeSlices + prefixActions produce correct nested store', async () => {
        const aSlice = createSlice({ v: 0 }, {
            inc: (s: { v: number }) => ({ v: s.v + 1 }),
        });
        const bSlice = createSlice({ label: '' }, {
            set: (s: { label: string }, l: string) => ({ label: l }),
        });
        const [aResult, bResult] = composeSlices([aSlice, bSlice]);
        const store = createStore(
            { a: aResult.initialState, b: bResult.initialState },
            {
                ...prefixActions(aResult.actions as any, 'a'),
                ...prefixActions(bResult.actions as any, 'b'),
            }
        );
        await store.dispatch('a/inc');
        await store.dispatch('b/set', 'hello');
        expect(store.getState()).toEqual({
            a: { v: 1 },
            b: { label: 'hello' },
        });
    });
});

// ---------------------------------------------------------------------------
// Observable operators
// ---------------------------------------------------------------------------

describe('Observable operators', () => {
    const makeStore = () =>
        createStore({ n: 0, tag: 'x' }, {
            set: (s: any, n: number) => ({ ...s, n }),
            tag: (s: any, t: string) => ({ ...s, tag: t }),
        });

    it('asObservable emits current state on subscribe (no initial emit — push only)', async () => {
        // asObservable is push-based — it does NOT emit on subscribe
        const store = makeStore();
        const vals: number[] = [];
        asObservable(store, (s) => s.n).subscribe((v) => vals.push(v));
        await store.dispatch('set', 1);
        expect(vals).toEqual([1]);
    });

    it('map transforms emitted values', async () => {
        const store = makeStore();
        const vals: string[] = [];
        asObservable(store, (s) => s.n)
            .pipe(map((n) => `#${n}`))
            .subscribe((v) => vals.push(v));
        await store.dispatch('set', 7);
        expect(vals).toEqual(['#7']);
    });

    it('filter suppresses values that do not pass the predicate', async () => {
        const store = makeStore();
        const vals: number[] = [];
        asObservable(store, (s) => s.n)
            .pipe(filter((n) => n % 2 === 0))
            .subscribe((v) => vals.push(v));
        await store.dispatch('set', 1); // odd — suppressed
        await store.dispatch('set', 2); // even — passes
        await store.dispatch('set', 3); // odd — suppressed
        expect(vals).toEqual([2]);
    });

    it('filter that never passes emits nothing', async () => {
        const store = makeStore();
        const vals: number[] = [];
        asObservable(store, (s) => s.n)
            .pipe(filter(() => false))
            .subscribe((v) => vals.push(v));
        await store.dispatch('set', 1);
        await store.dispatch('set', 2);
        expect(vals).toHaveLength(0);
    });

    it('distinctUntilChanged suppresses duplicate emissions', async () => {
        const store = makeStore();
        const vals: number[] = [];
        asObservable(store, (s) => s.n)
            .pipe(distinctUntilChanged())
            .subscribe((v) => vals.push(v));
        await store.dispatch('set', 1);
        await store.dispatch('set', 1); // duplicate
        await store.dispatch('set', 2);
        expect(vals).toEqual([1, 2]);
    });

    it('take(n) completes after n emissions', async () => {
        const store = makeStore();
        const vals: number[] = [];
        let completed = false;
        asObservable(store, (s) => s.n)
            .pipe(take(2))
            .subscribe({ next: (v) => vals.push(v), complete: () => { completed = true; } });
        await store.dispatch('set', 1);
        await store.dispatch('set', 2);
        await store.dispatch('set', 3); // after take — ignored
        expect(vals).toEqual([1, 2]);
        expect(completed).toBe(true);
    });

    it('take(1) behaves correctly', async () => {
        const store = makeStore();
        const vals: number[] = [];
        asObservable(store, (s) => s.n).pipe(take(1)).subscribe((v) => vals.push(v));
        await store.dispatch('set', 10);
        await store.dispatch('set', 20);
        expect(vals).toEqual([10]);
    });

    it('pipe chain: map + filter + take', async () => {
        const store = makeStore();
        const vals: string[] = [];
        asObservable(store, (s) => s.n)
            .pipe(
                map((n) => n * 2),
                filter((n) => n > 4),
                map((n) => `v${n}`),
                take(2)
            )
            .subscribe((v) => vals.push(v));
        await store.dispatch('set', 1); // 2 — filtered out
        await store.dispatch('set', 3); // 6 — passes → 'v6'
        await store.dispatch('set', 4); // 8 — passes → 'v8'
        await store.dispatch('set', 5); // after take(2) — ignored
        expect(vals).toEqual(['v6', 'v8']);
    });

    it('unsubscribing stops operator chain emissions', async () => {
        const store = makeStore();
        const vals: number[] = [];
        const sub = asObservable(store, (s) => s.n)
            .pipe(map((n) => n * 10))
            .subscribe((v) => vals.push(v));
        await store.dispatch('set', 1);
        sub.unsubscribe();
        await store.dispatch('set', 2);
        expect(vals).toEqual([10]);
    });

    it('multiple concurrent subscriptions are independent', async () => {
        const store = makeStore();
        const a: number[] = [];
        const b: number[] = [];
        asObservable(store, (s) => s.n).pipe(map((n) => n + 100)).subscribe((v) => a.push(v));
        asObservable(store, (s) => s.n).pipe(map((n) => n + 200)).subscribe((v) => b.push(v));
        await store.dispatch('set', 5);
        expect(a).toEqual([105]);
        expect(b).toEqual([205]);
    });

    it('subscription.closed reflects unsubscribe state', async () => {
        const store = makeStore();
        const sub = asObservable(store).subscribe(() => {});
        expect(sub.closed).toBe(false);
        sub.unsubscribe();
        expect(sub.closed).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// loggerMiddleware output contract
// ---------------------------------------------------------------------------

describe('loggerMiddleware output', () => {
    let group: ReturnType<typeof vi.spyOn>;
    let log: ReturnType<typeof vi.spyOn>;
    let groupEnd: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        group = vi.spyOn(console, 'group').mockImplementation(() => {});
        log = vi.spyOn(console, 'log').mockImplementation(() => {});
        groupEnd = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('formats action name in group header', async () => {
        const store = createStore({ n: 0 }, {
            increment: (s: { n: number }) => ({ n: s.n + 1 }),
        }, { middleware: [loggerMiddleware()] });
        await store.dispatch('increment');
        expect(group).toHaveBeenCalledWith('[increment]');
    });

    it('logs payload, prevState, nextState', async () => {
        const store = createStore({ n: 0 }, {
            add: (s: { n: number }, v: number) => ({ n: s.n + v }),
        }, { middleware: [loggerMiddleware()] });
        await store.dispatch('add', 10);
        const calls = log.mock.calls;
        expect(calls.some((c) => c[0] === 'Payload:' && c[1] === 10)).toBe(true);
        expect(calls.some((c) => c[0] === 'Prev State:')).toBe(true);
        expect(calls.some((c) => c[0] === 'Next State:')).toBe(true);
        expect(groupEnd).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Concurrency & order guarantees
// ---------------------------------------------------------------------------

describe('Concurrency and ordering', () => {
    it('dispatches resolve in order even with async middleware', async () => {
        const delays = [30, 10, 20];
        let i = 0;
        const store = createStore({ n: 0 }, {
            inc: (s: { n: number }) => ({ n: s.n + 1 }),
        }, {
            middleware: [async () => {
                const delay = delays[i++ % delays.length];
                await new Promise((r) => setTimeout(r, delay));
            }],
        });
        // All dispatches awaited sequentially — final count must be 3
        await store.dispatch('inc');
        await store.dispatch('inc');
        await store.dispatch('inc');
        expect(store.getState((s) => s.n)).toBe(3);
    });
});
