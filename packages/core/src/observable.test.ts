import { describe, expect, it, vi } from 'vitest';
import {
    asObservable,
    distinctUntilChanged,
    filter,
    map,
    take,
} from './observable';
import { createStore } from './store';

describe('Observable', () => {
    it('should create an observable from a store', (done) => {
        const store = createStore(
            { count: 0 },
            {
                increment: (state) => ({ ...state, count: state.count + 1 }),
            }
        );

        const observable$ = asObservable(store);
        const listener = vi.fn();

        observable$.subscribe(listener);
        store.dispatch('increment').then(() => {
            expect(listener).toHaveBeenCalledWith({ count: 1 });
            done();
        });
    });

    it('should create an observable with selector', (done) => {
        const store = createStore(
            { count: 0, name: 'Test' },
            {
                increment: (state) => ({ ...state, count: state.count + 1 }),
            }
        );

        const count$ = asObservable(store, (state) => state.count);
        const listener = vi.fn();

        count$.subscribe(listener);
        store.dispatch('increment').then(() => {
            expect(listener).toHaveBeenCalledWith(1);
            done();
        });
    });

    it('should support map operator', (done) => {
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

        store.dispatch('increment').then(() => {
            expect(listener).toHaveBeenCalledWith(2);
            done();
        });
    });

    it('should support filter operator', (done) => {
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

        store.dispatch('increment').then(() => {
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(1);
            done();
        });
    });

    it('should support distinctUntilChanged operator', (done) => {
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

        store.dispatch('increment').then(() => {
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(1);

            // Emitting without changing the count should not trigger listener
            return store.dispatch('updateOther');
        }).then(() => {
            expect(listener).toHaveBeenCalledTimes(1);
            done();
        });
    });

    it('should support take operator', (done) => {
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

        store.dispatch('increment')
            .then(() => {
                expect(listener).toHaveBeenCalledTimes(1);
                return store.dispatch('increment');
            })
            .then(() => {
                expect(listener).toHaveBeenCalledTimes(2);
                expect(subscription.closed).toBe(true);
                done();
            });
    });

    it('should unsubscribe correctly', (done) => {
        const store = createStore(
            { count: 0 },
            {
                increment: (state) => ({ ...state, count: state.count + 1 }),
            }
        );

        const observable$ = asObservable(store);
        const listener = vi.fn();
        const subscription = observable$.subscribe(listener);

        store.dispatch('increment').then(() => {
            expect(listener).toHaveBeenCalledTimes(1);

            subscription.unsubscribe();
            return store.dispatch('increment');
        }).then(() => {
            expect(listener).toHaveBeenCalledTimes(1);
            expect(subscription.closed).toBe(true);
            done();
        });
    });

    it('should support callback subscription pattern', (done) => {
        const store = createStore(
            { count: 0 },
            {
                increment: (state) => ({ ...state, count: state.count + 1 }),
            }
        );

        const observable$ = asObservable(store);
        const listener = vi.fn();

        observable$.subscribe(listener);

        store.dispatch('increment').then(() => {
            expect(listener).toHaveBeenCalledWith({ count: 1 });
            done();
        });
    });

    describe('distinctUntilChanged', () => {
        it('should always emit the first value', (done) => {
            const store = createStore(
                { count: 0 },
                {
                    setCount: (state, n: number) => ({ ...state, count: n }),
                }
            );

            const distinct$ = asObservable(store, (s) => s.count).pipe(
                distinctUntilChanged()
            );

            const listener = vi.fn();
            distinct$.subscribe(listener);

            // First dispatch: value changes from initial 0 → 1, must be emitted
            store.dispatch('setCount', 1).then(() => {
                expect(listener).toHaveBeenCalledTimes(1);
                expect(listener).toHaveBeenCalledWith(1);
                done();
            });
        });

        it('should suppress identical consecutive values', (done) => {
            const store = createStore(
                { count: 0, tag: 'a' },
                {
                    setCount: (state, n: number) => ({ ...state, count: n }),
                    setTag: (state, t: string) => ({ ...state, tag: t }),
                }
            );

            const distinct$ = asObservable(store, (s) => s.count).pipe(
                distinctUntilChanged()
            );

            const listener = vi.fn();
            distinct$.subscribe(listener);

            store
                .dispatch('setCount', 5)   // count: 0 → 5, emit
                .then(() => store.dispatch('setTag', 'b'))  // count unchanged, suppress
                .then(() => store.dispatch('setTag', 'c'))  // count unchanged, suppress
                .then(() => store.dispatch('setCount', 5))  // same value 5 → 5, suppress
                .then(() => store.dispatch('setCount', 6))  // count: 5 → 6, emit
                .then(() => {
                    expect(listener).toHaveBeenCalledTimes(2);
                    expect(listener).toHaveBeenNthCalledWith(1, 5);
                    expect(listener).toHaveBeenNthCalledWith(2, 6);
                    done();
                });
        });

        it('should use custom comparator when provided', (done) => {
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

            store
                .dispatch('setValue', 3)  // odd → odd (same parity), suppress
                .then(() => store.dispatch('setValue', 2))  // odd → even, emit
                .then(() => store.dispatch('setValue', 4))  // even → even, suppress
                .then(() => store.dispatch('setValue', 7))  // even → odd, emit
                .then(() => {
                    expect(listener).toHaveBeenCalledTimes(2);
                    expect(listener).toHaveBeenNthCalledWith(1, 2);
                    expect(listener).toHaveBeenNthCalledWith(2, 7);
                    done();
                });
        });

        it('each subscription has independent state', (done) => {
            const store = createStore(
                { count: 0 },
                {
                    setCount: (state, n: number) => ({ ...state, count: n }),
                }
            );

            const source$ = asObservable(store, (s) => s.count).pipe(
                distinctUntilChanged()
            );

            const listenerA = vi.fn();
            const listenerB = vi.fn();
            source$.subscribe(listenerA);
            source$.subscribe(listenerB);

            store
                .dispatch('setCount', 1)
                .then(() => store.dispatch('setCount', 1))  // suppress for both
                .then(() => store.dispatch('setCount', 2))  // emit for both
                .then(() => {
                    expect(listenerA).toHaveBeenCalledTimes(2);
                    expect(listenerB).toHaveBeenCalledTimes(2);
                    done();
                });
        });
    });

    it('should chain multiple operators', (done) => {
        const store = createStore(
            { count: 0 },
            {
                increment: (state) => ({ ...state, count: state.count + 1 }),
            }
        );

        const observable$ = asObservable(store)
            .pipe(
                map((state) => state.count),
                filter((count) => count > 0),
                map((count) => count * 2),
                distinctUntilChanged()
            );

        const listener = vi.fn();
        observable$.subscribe(listener);

        store.dispatch('increment').then(() => {
            expect(listener).toHaveBeenCalledWith(2);
            done();
        });
    });
});
