/**
 * @polystate/core — performance benchmarks
 *
 * Uses Vitest's built-in bench() API (wraps tinybench).
 *
 * Run:
 *   npx vitest bench --config vitest.bench.config.ts
 *
 * Numbers to watch:
 *   - dispatch throughput (ops/sec)
 *   - subscribe/unsubscribe cost
 *   - selective vs global subscription overhead
 *   - observable operator chain throughput
 */
import { bench, describe } from 'vitest';
import {
    asObservable,
    createStore,
    distinctUntilChanged,
    filter,
    map,
    take,
} from '../packages/core/src/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeCounter = () =>
    createStore(
        { count: 0 },
        { inc: (s: { count: number }) => ({ count: s.count + 1 }) }
    );

const makePayloadStore = () =>
    createStore(
        { n: 0, label: '' },
        {
            setN:     (s: any, n: number) => ({ ...s, n }),
            setLabel: (s: any, l: string) => ({ ...s, label: l }),
        }
    );

// ---------------------------------------------------------------------------
// 1. Dispatch throughput
// ---------------------------------------------------------------------------

describe('Dispatch throughput', () => {
    bench('simple action (no payload)', async () => {
        const store = makeCounter();
        await store.dispatch('inc');
    });

    bench('action with numeric payload', async () => {
        const store = makePayloadStore();
        await store.dispatch('setN', 42);
    });

    bench('10 sequential dispatches', async () => {
        const store = makeCounter();
        for (let i = 0; i < 10; i++) await store.dispatch('inc');
    });

    bench('100 sequential dispatches', async () => {
        const store = makeCounter();
        for (let i = 0; i < 100; i++) await store.dispatch('inc');
    });
});

// ---------------------------------------------------------------------------
// 2. Subscribe / unsubscribe
// ---------------------------------------------------------------------------

describe('Subscribe / unsubscribe', () => {
    bench('subscribe + unsubscribe (global)', () => {
        const store = makeCounter();
        const unsub = store.subscribe((_) => {});
        unsub();
    });

    bench('subscribe + unsubscribe (selective)', () => {
        const store = makeCounter();
        const sel = (s: { count: number }) => s.count;
        const unsub = store.subscribe(sel, (_) => {});
        unsub();
    });

    bench('dispatch with 1 global subscriber', async () => {
        const store = makeCounter();
        store.subscribe((_) => {});
        await store.dispatch('inc');
    });

    bench('dispatch with 10 global subscribers', async () => {
        const store = makeCounter();
        for (let i = 0; i < 10; i++) store.subscribe((_) => {});
        await store.dispatch('inc');
    });

    bench('dispatch with 100 global subscribers', async () => {
        const store = makeCounter();
        for (let i = 0; i < 100; i++) store.subscribe((_) => {});
        await store.dispatch('inc');
    });

    bench('dispatch with 1 selective subscriber (matching)', async () => {
        const store = makeCounter();
        store.subscribe((s) => s.count, (_) => {});
        await store.dispatch('inc');
    });

    bench('dispatch with 10 selective subscribers on different selectors', async () => {
        const store = createStore(
            Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`k${i}`, i])),
            { inc: (s: any) => ({ ...s, k0: s.k0 + 1 }) }
        );
        for (let i = 0; i < 10; i++) {
            const key = `k${i}`;
            store.subscribe((s: any) => s[key], () => {});
        }
        await store.dispatch('inc');
    });
});

// ---------------------------------------------------------------------------
// 3. getState performance
// ---------------------------------------------------------------------------

describe('getState', () => {
    const store = makeCounter();

    bench('getState() — full state snapshot', () => {
        store.getState();
    });

    bench('getState(selector) — slice', () => {
        store.getState((s) => s.count);
    });
});

// ---------------------------------------------------------------------------
// 4. setState performance
// ---------------------------------------------------------------------------

describe('setState', () => {
    bench('setState — partial update, no subscribers', () => {
        const store = makeCounter();
        store.setState({ count: 42 });
    });

    bench('setState — partial update, 5 global subscribers', () => {
        const store = makeCounter();
        for (let i = 0; i < 5; i++) store.subscribe(() => {});
        store.setState({ count: 42 });
    });
});

// ---------------------------------------------------------------------------
// 5. reset / destroy
// ---------------------------------------------------------------------------

describe('reset / destroy', () => {
    bench('reset()', () => {
        const store = makeCounter();
        store.reset();
    });

    bench('destroy()', () => {
        const store = makeCounter();
        store.destroy();
    });
});

// ---------------------------------------------------------------------------
// 6. Observable operator chains
// ---------------------------------------------------------------------------

describe('Observable operator chains', () => {
    bench('asObservable subscribe + 1 dispatch', async () => {
        const store = makeCounter();
        const sub = asObservable(store, (s) => s.count).subscribe(() => {});
        await store.dispatch('inc');
        sub.unsubscribe();
    });

    bench('map operator: subscribe + 1 dispatch', async () => {
        const store = makeCounter();
        const sub = asObservable(store, (s) => s.count)
            .pipe(map((n) => n * 2))
            .subscribe(() => {});
        await store.dispatch('inc');
        sub.unsubscribe();
    });

    bench('map + filter + distinctUntilChanged: subscribe + 10 dispatches', async () => {
        const store = makeCounter();
        const sub = asObservable(store, (s) => s.count)
            .pipe(
                map((n) => n * 2),
                filter((n) => n % 4 === 0),
                distinctUntilChanged()
            )
            .subscribe(() => {});
        for (let i = 0; i < 10; i++) await store.dispatch('inc');
        sub.unsubscribe();
    });

    bench('take(50): subscribe + 50 dispatches', async () => {
        const store = makeCounter();
        const sub = asObservable(store, (s) => s.count)
            .pipe(take(50))
            .subscribe(() => {});
        for (let i = 0; i < 50; i++) await store.dispatch('inc');
        sub.unsubscribe();
    });
});

// ---------------------------------------------------------------------------
// 7. Store creation cost
// ---------------------------------------------------------------------------

describe('Store creation', () => {
    bench('createStore — 3 actions', () => {
        createStore(
            { a: 0, b: '', c: false },
            {
                setA: (s: any, v: number) => ({ ...s, a: v }),
                setB: (s: any, v: string) => ({ ...s, b: v }),
                setC: (s: any, v: boolean) => ({ ...s, c: v }),
            }
        );
    });

    bench('createStore — 20 actions', () => {
        const actions: Record<string, any> = {};
        for (let i = 0; i < 20; i++) {
            actions[`action${i}`] = (s: any) => ({ ...s, [`k${i}`]: i });
        }
        createStore({}, actions);
    });
});
