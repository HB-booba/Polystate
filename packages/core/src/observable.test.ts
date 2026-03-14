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
