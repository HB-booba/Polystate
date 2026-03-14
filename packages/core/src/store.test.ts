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

    it('should notify global subscribers', (done) => {
        const listener = vi.fn();
        store.subscribe(listener);

        store.dispatch('increment').then(() => {
            expect(listener).toHaveBeenCalledWith({ count: 1, name: 'Test' });
            done();
        });
    });

    it('should support selective subscription', (done) => {
        const listener = vi.fn();
        store.subscribe((state) => state.count, listener);

        store.dispatch('increment').then(() => {
            expect(listener).toHaveBeenCalledWith(1);
            done();
        });
    });

    it('should not notify selective subscribers if value did not change', (done) => {
        const listener = vi.fn();
        store.subscribe((state) => state.name, listener);

        store.dispatch('increment').then(() => {
            expect(listener).not.toHaveBeenCalled();
            done();
        });
    });

    it('should unsubscribe correctly', (done) => {
        const listener = vi.fn();
        const unsubscribe = store.subscribe(listener);

        store.dispatch('increment').then(() => {
            expect(listener).toHaveBeenCalledTimes(1);

            unsubscribe();
            return store.dispatch('increment');
        }).then(() => {
            expect(listener).toHaveBeenCalledTimes(1);
            done();
        });
    });

    it('should support thunk actions', (done) => {
        store.dispatch(async (dispatch, getState) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            const state = getState();
            expect(state.count).toBe(0);
            dispatch('increment');
        }).then(() => {
            expect(store.getState().count).toBe(1);
            done();
        });
    });

    it('should warn if action not found', (done) => {
        const warnSpy = vi.spyOn(console, 'warn');

        store.dispatch('nonexistent').then(() => {
            expect(warnSpy).toHaveBeenCalledWith('No action handler found for "nonexistent"');
            warnSpy.mockRestore();
            done();
        });
    });

    it('should run middleware', (done) => {
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

        storeWithMiddleware.dispatch('increment').then(() => {
            expect(middlewareFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'increment',
                    prevState: { count: 0, name: 'Test' },
                    nextState: { count: 1, name: 'Test' },
                })
            );
            done();
        });
    });

    it('should support multiple subscribers', (done) => {
        const listener1 = vi.fn();
        const listener2 = vi.fn();

        store.subscribe(listener1);
        store.subscribe(listener2);

        store.dispatch('increment').then(() => {
            expect(listener1).toHaveBeenCalled();
            expect(listener2).toHaveBeenCalled();
            done();
        });
    });

    it('should support complex nested state', (done) => {
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

        complexStore.dispatch('updateAge', 31).then(() => {
            expect(listener).toHaveBeenCalledWith(31);
            done();
        });
    });
});
