/**
 * @polystate/core — consumer-level integration tests.
 *
 * These tests import exclusively from the compiled dist/ artefacts,
 * mirroring what a real application does after `npm install @polystate/core`.
 */
import {
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
} from '@polystate/core';
import { describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CounterState {
    count: number;
    label: string;
}

function makeCounterStore() {
    return createStore<CounterState>(
        { count: 0, label: 'counter' },
        {
            increment: (s) => ({ ...s, count: s.count + 1 }),
            decrement: (s) => ({ ...s, count: s.count - 1 }),
            add: (s, n: number) => ({ ...s, count: s.count + n }),
            setLabel: (s, label: string) => ({ ...s, label }),
        }
    );
}

// ---------------------------------------------------------------------------
// 1. Store — basic API
// ---------------------------------------------------------------------------

describe('@polystate/core — Store', () => {
    it('initialises with provided state', () => {
        const store = makeCounterStore();
        expect(store.getState()).toEqual({ count: 0, label: 'counter' });
    });

    it('getState with selector returns slice', () => {
        const store = makeCounterStore();
        expect(store.getState((s) => s.count)).toBe(0);
    });

    it('dispatch updates state synchronously-ish', async () => {
        const store = makeCounterStore();
        await store.dispatch('increment');
        expect(store.getState().count).toBe(1);
        await store.dispatch('increment');
        await store.dispatch('decrement');
        expect(store.getState().count).toBe(1);
    });

    it('dispatch with payload', async () => {
        const store = makeCounterStore();
        await store.dispatch('add', 10);
        expect(store.getState().count).toBe(10);
    });

    it('setState partial merge', () => {
        const store = makeCounterStore();
        store.setState({ count: 99 });
        expect(store.getState()).toEqual({ count: 99, label: 'counter' });
    });

    it('global subscriber is called on every change', async () => {
        const store = makeCounterStore();
        const listener = vi.fn();
        store.subscribe(listener);
        await store.dispatch('increment');
        await store.dispatch('setLabel', 'new');
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('selective subscriber fires only when its slice changes', async () => {
        const store = makeCounterStore();
        const onCount = vi.fn();
        const onLabel = vi.fn();
        store.subscribe((s) => s.count, onCount);
        store.subscribe((s) => s.label, onLabel);

        await store.dispatch('increment');   // count changes → onCount fires
        await store.dispatch('setLabel', 'x'); // label changes → onLabel fires
        await store.dispatch('increment');   // count changes → onCount fires

        expect(onCount).toHaveBeenCalledTimes(2);
        expect(onLabel).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe stops notifications', async () => {
        const store = makeCounterStore();
        const listener = vi.fn();
        const unsub = store.subscribe(listener);
        await store.dispatch('increment');
        unsub();
        await store.dispatch('increment');
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('warns when dispatching unknown action', async () => {
        const store = makeCounterStore();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });
        await store.dispatch('nonexistent');
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('nonexistent'));
        warn.mockRestore();
    });

    it('thunk receives dispatch + getState', async () => {
        const store = makeCounterStore();
        await store.dispatch(async (dispatch, getState) => {
            const before = getState().count;
            dispatch('increment');
            expect(getState().count).toBe(before + 1);
        });
    });
});

// ---------------------------------------------------------------------------
// 2. Slices
// ---------------------------------------------------------------------------

describe('@polystate/core — Slices', () => {
    it('createSlice + prefixActions scopes handlers', async () => {
        interface RootState {
            counter: { value: number };
            user: { name: string };
        }

        const counterSlice = createSlice(
            { value: 0 },
            { inc: (s) => ({ ...s, value: s.value + 1 }) }
        );

        const userSlice = createSlice(
            { name: 'anon' },
            { setName: (s, name: string) => ({ ...s, name }) }
        );

        const rootStore = createStore<RootState>(
            { counter: { value: 0 }, user: { name: 'anon' } },
            {
                ...prefixActions(counterSlice.actions, 'counter'),
                ...prefixActions(userSlice.actions, 'user'),
            }
        );

        await rootStore.dispatch('counter/inc');
        expect(rootStore.getState().counter.value).toBe(1);
        expect(rootStore.getState().user.name).toBe('anon'); // unchanged

        await rootStore.dispatch('user/setName', 'Alice');
        expect(rootStore.getState().user.name).toBe('Alice');
        expect(rootStore.getState().counter.value).toBe(1); // unchanged
    });

    it('composeSlices merges slices into a nested store', async () => {
        // prefixActions nests each slice under its own key in the combined state:
        //   { counter: { count: 0 }, label: { text: '' } }
        // composeSlices returns [{initialState, actions}...] — useful for iteration.

        const counterSlice = createSlice(
            { count: 0 },
            { bump: (s: { count: number }) => ({ ...s, count: s.count + 1 }) }
        );

        const labelSlice = createSlice(
            { text: '' },
            { write: (s: { text: string }, t: string) => ({ ...s, text: t }) }
        );

        // composeSlices just maps to {initialState, actions} — iterate and spread
        const [counterResult, labelResult] = composeSlices([counterSlice, labelSlice]);

        const store = createStore(
            {
                counter: counterResult.initialState,
                label:   labelResult.initialState,
            },
            {
                ...prefixActions(counterResult.actions as any, 'counter'),
                ...prefixActions(labelResult.actions   as any, 'label'),
            }
        );

        await store.dispatch('counter/bump');
        await store.dispatch('label/write', 'hello');

        expect(store.getState()).toEqual({
            counter: { count: 1 },
            label:   { text: 'hello' },
        });
    });
});

// ---------------------------------------------------------------------------
// 3. Observables
// ---------------------------------------------------------------------------

describe('@polystate/core — Observable operators', () => {
    it('asObservable emits on every state change', async () => {
        const store = makeCounterStore();
        const received: CounterState[] = [];
        asObservable(store).subscribe((s) => received.push(s));

        await store.dispatch('increment');
        await store.dispatch('increment');

        expect(received).toHaveLength(2);
        expect(received[1]!.count).toBe(2);
    });

    it('asObservable + selector emits only selected slice', async () => {
        const store = makeCounterStore();
        const values: number[] = [];
        asObservable(store, (s) => s.count).subscribe((v) => values.push(v));

        await store.dispatch('increment');   // emits
        await store.dispatch('setLabel', 'x'); // does NOT emit (count unchanged)
        await store.dispatch('increment');   // emits

        expect(values).toEqual([1, 2]);
    });

    it('map transforms values', async () => {
        const store = makeCounterStore();
        const results: string[] = [];

        asObservable(store, (s) => s.count)
            .pipe(map((n) => `count:${n}`))
            .subscribe((v) => results.push(v));

        await store.dispatch('increment');
        expect(results).toEqual(['count:1']);
    });

    it('filter skips values that fail predicate', async () => {
        const store = makeCounterStore();
        const results: number[] = [];

        asObservable(store, (s) => s.count)
            .pipe(filter((n) => n % 2 === 0)) // only even
            .subscribe((v) => results.push(v));

        await store.dispatch('increment'); // 1 — filtered
        await store.dispatch('increment'); // 2 — emits
        await store.dispatch('increment'); // 3 — filtered

        expect(results).toEqual([2]);
    });

    it('distinctUntilChanged suppresses duplicate emissions', async () => {
        const store = createStore(
            { a: 0, b: 0 },
            {
                bumpA: (s) => ({ ...s, a: s.a + 1 }),
                bumpB: (s) => ({ ...s, b: s.b + 1 }),
            }
        );

        const seen: number[] = [];
        asObservable(store, (s) => s.a)
            .pipe(distinctUntilChanged())
            .subscribe((v) => seen.push(v));

        await store.dispatch('bumpA');  // a:0→1 emit
        await store.dispatch('bumpB');  // a unchanged — suppress
        await store.dispatch('bumpB');  // a unchanged — suppress
        await store.dispatch('bumpA');  // a:1→2 emit

        expect(seen).toEqual([1, 2]);
    });

    it('take completes after N emissions', async () => {
        const store = makeCounterStore();
        const results: number[] = [];
        const completed = vi.fn();

        asObservable(store, (s) => s.count)
            .pipe(take(2))
            .subscribe({ next: (v) => results.push(v), complete: completed });

        await store.dispatch('increment'); // 1 — taken
        await store.dispatch('increment'); // 2 — taken, complete fires
        await store.dispatch('increment'); // 3 — ignored (subscription closed)

        expect(results).toEqual([1, 2]);
        expect(completed).toHaveBeenCalledTimes(1);
    });

    it('pipe chains operators correctly', async () => {
        const store = makeCounterStore();
        const results: string[] = [];

        asObservable(store, (s) => s.count)
            .pipe(
                filter((n) => n > 0),
                map((n) => n * 10),
                distinctUntilChanged(),
                map((n) => `${n}px`)
            )
            .subscribe((v) => results.push(v));

        await store.dispatch('increment'); // 1 → 10 → "10px"
        await store.dispatch('increment'); // 2 → 20 → "20px"

        expect(results).toEqual(['10px', '20px']);
    });
});

// ---------------------------------------------------------------------------
// 4. Middleware
// ---------------------------------------------------------------------------

describe('@polystate/core — Middleware', () => {
    it('loggerMiddleware logs action details', async () => {
        const group = vi.spyOn(console, 'group').mockImplementation(() => { });
        const log = vi.spyOn(console, 'log').mockImplementation(() => { });
        const end = vi.spyOn(console, 'groupEnd').mockImplementation(() => { });

        const store = createStore(
            { count: 0 },
            { inc: (s) => ({ ...s, count: s.count + 1 }) },
            { middleware: [loggerMiddleware()] }
        );

        await store.dispatch('inc');

        expect(group).toHaveBeenCalledWith('[inc]');
        expect(log).toHaveBeenCalled();
        expect(end).toHaveBeenCalled();

        group.mockRestore();
        log.mockRestore();
        end.mockRestore();
    });

    it('persistMiddleware saves+loads state', async () => {
        const storage: Record<string, string> = {};
        const mockStorage: Storage = {
            getItem: (k) => storage[k] ?? null,
            setItem: (k, v) => { storage[k] = v; },
            removeItem: (k) => { delete storage[k]; },
            clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
            length: 0,
            key: () => null,
        };

        const store = createStore(
            { count: 0 },
            { inc: (s) => ({ ...s, count: s.count + 1 }) },
            { middleware: [persistMiddleware('test', mockStorage)] }
        );

        await store.dispatch('inc');
        await store.dispatch('inc');

        expect(JSON.parse(storage['test']!)).toEqual({ count: 2 });

        const loaded = loadPersistedState<{ count: number }>('test', mockStorage);
        expect(loaded).toEqual({ count: 2 });
    });

    it('custom middleware receives full context', async () => {
        const calls: Array<{ action: string; prevCount: number; nextCount: number }> = [];

        const tracer = ({ action, prevState, nextState }: any) => {
            calls.push({
                action,
                prevCount: prevState.count,
                nextCount: nextState.count,
            });
        };

        const store = createStore(
            { count: 0 },
            { inc: (s) => ({ ...s, count: s.count + 1 }) },
            { middleware: [tracer] }
        );

        await store.dispatch('inc');
        await store.dispatch('inc');

        expect(calls).toEqual([
            { action: 'inc', prevCount: 0, nextCount: 1 },
            { action: 'inc', prevCount: 1, nextCount: 2 },
        ]);
    });
});
