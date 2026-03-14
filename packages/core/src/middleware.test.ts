import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    devToolsMiddleware,
    loadPersistedState,
    loggerMiddleware,
    persistMiddleware,
} from './middleware';
import { createStore } from './store';

describe('Middleware', () => {
    interface TestState {
        count: number;
    }

    describe('loggerMiddleware', () => {
        it('should log actions', (done) => {
            const groupSpy = vi.spyOn(console, 'group');
            const logSpy = vi.spyOn(console, 'log');
            const groupEndSpy = vi.spyOn(console, 'groupEnd');

            const store = createStore<TestState>(
                { count: 0 },
                {
                    increment: (state) => ({ ...state, count: state.count + 1 }),
                },
                {
                    middleware: [loggerMiddleware()],
                }
            );

            store.dispatch('increment').then(() => {
                expect(groupSpy).toHaveBeenCalledWith('[increment]');
                expect(logSpy).toHaveBeenCalled();
                expect(groupEndSpy).toHaveBeenCalled();

                groupSpy.mockRestore();
                logSpy.mockRestore();
                groupEndSpy.mockRestore();
                done();
            });
        });
    });

    describe('persistMiddleware', () => {
        let mockStorage: Record<string, string>;

        beforeEach(() => {
            mockStorage = {};
        });

        it('should persist state to storage', (done) => {
            const testStorage = {
                getItem: (key: string) => mockStorage[key] ?? null,
                setItem: (key: string, value: string) => {
                    mockStorage[key] = value;
                },
                removeItem: (key: string) => {
                    delete mockStorage[key];
                },
                clear: () => {
                    mockStorage = {};
                },
                length: 0,
                key: (index: number) => null,
            } as Storage;

            const store = createStore<TestState>(
                { count: 0 },
                {
                    increment: (state) => ({ ...state, count: state.count + 1 }),
                },
                {
                    middleware: [persistMiddleware('test-store', testStorage)],
                }
            );

            store.dispatch('increment').then(() => {
                expect(mockStorage['test-store']).toBe(JSON.stringify({ count: 1 }));
                done();
            });
        });

        it('should load persisted state', () => {
            const testStorage = {
                getItem: (key: string) => mockStorage[key] ?? null,
                setItem: (key: string, value: string) => {
                    mockStorage[key] = value;
                },
                removeItem: (key: string) => {
                    delete mockStorage[key];
                },
                clear: () => {
                    mockStorage = {};
                },
                length: 0,
                key: (index: number) => null,
            } as Storage;

            mockStorage['test-store'] = JSON.stringify({ count: 42 });

            const loaded = loadPersistedState<TestState>('test-store', testStorage);
            expect(loaded).toEqual({ count: 42 });
        });

        it('should return null if state not persisted', () => {
            const testStorage = {
                getItem: () => null,
                setItem: () => { },
                removeItem: () => { },
                clear: () => { },
                length: 0,
                key: () => null,
            } as Storage;

            const loaded = loadPersistedState<TestState>('nonexistent', testStorage);
            expect(loaded).toBeNull();
        });

        it('should handle storage errors gracefully', (done) => {
            const errorStorage = {
                getItem: () => {
                    throw new Error('Storage error');
                },
                setItem: () => {
                    throw new Error('Storage error');
                },
                removeItem: () => { },
                clear: () => { },
                length: 0,
                key: () => null,
            } as Storage;

            const errorSpy = vi.spyOn(console, 'error');

            const store = createStore<TestState>(
                { count: 0 },
                {
                    increment: (state) => ({ ...state, count: state.count + 1 }),
                },
                {
                    middleware: [persistMiddleware('test-store', errorStorage)],
                }
            );

            store.dispatch('increment').then(() => {
                expect(errorSpy).toHaveBeenCalled();
                errorSpy.mockRestore();
                done();
            });
        });
    });

    describe('devToolsMiddleware', () => {
        it('should send actions to devtools if available', (done) => {
            const devtoolsMock = {
                send: vi.fn(),
            };

            const original = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
            (window as any).__REDUX_DEVTOOLS_EXTENSION__ = () => devtoolsMock;

            const store = createStore<TestState>(
                { count: 0 },
                {
                    increment: (state) => ({ ...state, count: state.count + 1 }),
                },
                {
                    middleware: [devToolsMiddleware('TestStore')],
                }
            );

            store.dispatch('increment').then(() => {
                expect(devtoolsMock.send).toHaveBeenCalledWith(
                    { type: 'increment', payload: undefined },
                    { count: 1 }
                );

                (window as any).__REDUX_DEVTOOLS_EXTENSION__ = original;
                done();
            });
        });

        it('should handle missing devtools gracefully', (done) => {
            const original = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
            delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;

            const store = createStore<TestState>(
                { count: 0 },
                {
                    increment: (state) => ({ ...state, count: state.count + 1 }),
                },
                {
                    middleware: [devToolsMiddleware()],
                }
            );

            // Should not throw
            store.dispatch('increment').then(() => {
                (window as any).__REDUX_DEVTOOLS_EXTENSION__ = original;
                done();
            });
        });
    });
});
