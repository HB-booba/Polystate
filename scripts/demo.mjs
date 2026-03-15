#!/usr/bin/env node
/**
 * Polystate — runnable demo
 *
 * Showcases the full public API of @polystate/core.
 * Builds must exist before running this script:
 *
 *   cd packages/core && npm run build
 *   node scripts/demo.mjs
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
} from '../packages/core/dist/index.js';

const hr = (label) =>
    console.log(`\n${'─'.repeat(60)}\n  ${label}\n${'─'.repeat(60)}`);

// ---------------------------------------------------------------------------
// 1. Basic store
// ---------------------------------------------------------------------------

hr('1 · Basic store');

const counterStore = createStore(
    { count: 0 },
    {
        increment: (s) => ({ count: s.count + 1 }),
        decrement: (s) => ({ count: s.count - 1 }),
        addBy:     (s, n) => ({ count: s.count + n }),
        reset:     ()     => ({ count: 0 }),
    }
);

const unsub = counterStore.subscribe((s) => console.log('  → state:', s));

await counterStore.dispatch('increment');
await counterStore.dispatch('increment');
await counterStore.dispatch('addBy', 5);
await counterStore.dispatch('decrement');

console.log('  final:', counterStore.getState()); // { count: 6 }
unsub();

// ---------------------------------------------------------------------------
// 2. Selective subscription (only re-fires when selected slice changes)
// ---------------------------------------------------------------------------

hr('2 · Selective subscription');

const appStore = createStore(
    { count: 0, filter: 'all', loading: false },
    {
        inc:       (s) => ({ ...s, count: s.count + 1 }),
        setFilter: (s, f) => ({ ...s, filter: f }),
        setLoad:   (s, b) => ({ ...s, loading: b }),
    }
);

const countUnsub = appStore.subscribe(
    (s) => s.count,
    (count) => console.log('  count changed →', count)
);

await appStore.dispatch('setFilter', 'active'); // count listener NOT fired
await appStore.dispatch('setLoad', true);        // count listener NOT fired
await appStore.dispatch('inc');                  // count listener fires: 1
await appStore.dispatch('inc');                  // count listener fires: 2

countUnsub();

// ---------------------------------------------------------------------------
// 3. getState with selector
// ---------------------------------------------------------------------------

hr('3 · getState with selector');

console.log('  count:', appStore.getState((s) => s.count));    // 2
console.log('  filter:', appStore.getState((s) => s.filter));  // active

// ---------------------------------------------------------------------------
// 4. getActionNames & reset
// ---------------------------------------------------------------------------

hr('4 · getActionNames + reset()');

const storeB = createStore({ x: 10 }, {
    double: (s) => ({ x: s.x * 2 }),
    negate: (s) => ({ x: -s.x }),
});
console.log('  actions:', storeB.getActionNames());  // ['double', 'negate']
await storeB.dispatch('double');
console.log('  after double:', storeB.getState());   // { x: 20 }
storeB.reset();
console.log('  after reset: ', storeB.getState());   // { x: 10 }

// ---------------------------------------------------------------------------
// 5. Thunk actions
// ---------------------------------------------------------------------------

hr('5 · Thunk actions (async)');

const apiStore = createStore(
    { items: [], loading: false, error: null },
    {
        setLoading: (s, v) => ({ ...s, loading: v }),
        setItems:   (s, items) => ({ ...s, items, loading: false }),
        setError:   (s, error) => ({ ...s, error, loading: false }),
    }
);

const fetchItems = async (dispatch, getState) => {
    console.log('  fetching…  loading:', getState().loading);
    await dispatch('setLoading', true);
    // Simulate async work
    await new Promise((r) => setTimeout(r, 20));
    await dispatch('setItems', ['apple', 'banana', 'cherry']);
    console.log('  done.       items:', getState().items.length);
};

await apiStore.dispatch(fetchItems);

// ---------------------------------------------------------------------------
// 6. Observable operators
// ---------------------------------------------------------------------------

hr('6 · Observable + pipe operators');

const numStore = createStore({ n: 0 }, {
    set: (s, n) => ({ n }),
});

console.log('  subscribing to even numbers only, × 10, take 3:');
const collected = [];

const sub = asObservable(numStore, (s) => s.n)
    .pipe(
        filter((n) => n % 2 === 0),
        map((n) => n * 10),
        take(3)
    )
    .subscribe({
        next:     (v) => { collected.push(v); console.log('  emit →', v); },
        complete: ()  => console.log('  completed (take 3 reached)'),
    });

for (let i = 1; i <= 8; i++) await numStore.dispatch('set', i);
console.log('  collected:', collected); // [20, 40, 60]
sub.unsubscribe();

// ---------------------------------------------------------------------------
// 7. distinctUntilChanged
// ---------------------------------------------------------------------------

hr('7 · distinctUntilChanged');

const tagStore = createStore({ tag: 'a' }, { set: (_, t) => ({ tag: t }) });
const tags = [];
asObservable(tagStore, (s) => s.tag)
    .pipe(distinctUntilChanged())
    .subscribe((t) => { tags.push(t); console.log('  tag →', t); });

await tagStore.dispatch('set', 'a'); // duplicate — suppressed
await tagStore.dispatch('set', 'b');
await tagStore.dispatch('set', 'b'); // duplicate — suppressed
await tagStore.dispatch('set', 'c');
console.log('  unique tags:', tags); // ['b', 'c']

// ---------------------------------------------------------------------------
// 8. Slices + prefixActions + composeSlices
// ---------------------------------------------------------------------------

hr('8 · Slices, prefixActions, composeSlices');

const counterSlice = createSlice(
    { count: 0 },
    {
        inc: (s) => ({ count: s.count + 1 }),
        set: (s, n) => ({ count: n }),
    }
);

const labelSlice = createSlice(
    { text: 'hello' },
    { update: (s, t) => ({ text: t }) }
);

const [counterResult, labelResult] = composeSlices([counterSlice, labelSlice]);

const combinedStore = createStore(
    {
        counter: counterResult.initialState,
        label:   labelResult.initialState,
    },
    {
        ...prefixActions(counterResult.actions, 'counter'),
        ...prefixActions(labelResult.actions, 'label'),
    }
);

await combinedStore.dispatch('counter/inc');
await combinedStore.dispatch('counter/inc');
await combinedStore.dispatch('label/update', 'world');
console.log('  state:', combinedStore.getState());
// { counter: { count: 2 }, label: { text: 'world' } }

// ---------------------------------------------------------------------------
// 9. Middleware: logging + persistence
// ---------------------------------------------------------------------------

hr('9 · Middleware — persistence');

const storage = {};
const mockLS = {
    getItem:    (k)    => storage[k] ?? null,
    setItem:    (k, v) => { storage[k] = v; },
    removeItem: (k)    => { delete storage[k]; },
    length: 0,
    clear: () => {},
    key: () => null,
};

const persistedStore = createStore(
    { visits: 0 },
    { visit: (s) => ({ visits: s.visits + 1 }) },
    { middleware: [persistMiddleware('demo:visits', mockLS)] }
);

await persistedStore.dispatch('visit');
await persistedStore.dispatch('visit');
console.log('  persisted:', storage['demo:visits']); // {"visits":2}

// Reload simulation: hydrate from storage
const hydrated = loadPersistedState('demo:visits', mockLS);
const rehydratedStore = createStore(
    hydrated ?? { visits: 0 },
    { visit: (s) => ({ visits: s.visits + 1 }) }
);
console.log('  rehydrated:', rehydratedStore.getState()); // { visits: 2 }

// ---------------------------------------------------------------------------
// 10. destroy() — memory-safe cleanup
// ---------------------------------------------------------------------------

hr('10 · destroy() — clean up resources');

const tempStore = createStore({ v: 0 }, {
    set: (s, v) => ({ v }),
});
const tempCb = (s) => console.log('  temp update:', s); // should never log
tempStore.subscribe(tempCb);
tempStore.destroy();
await tempStore.dispatch('set', 42); // no-op
console.log('  tempStore state still at initial value (store destroyed)');

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

hr('✅ Done — all demos completed successfully');
