import type { Selector, Store } from './store';

/**
 * RxJS-compatible Observer interface.
 */
export interface Observer<T> {
    next?(value: T): void;
    error?(err: any): void;
    complete?(): void;
}

/**
 * RxJS-compatible Observable interface.
 */
export interface Observable<T> {
    subscribe(observer: Observer<T>): Subscription;
    subscribe(next: ((value: T) => void) | null, error?: (err: any) => void, complete?: () => void): Subscription;
    pipe(): Observable<T>;
    pipe<A>(op1: (obs: Observable<T>) => Observable<A>): Observable<A>;
    pipe<A, B>(
        op1: (obs: Observable<T>) => Observable<A>,
        op2: (obs: Observable<A>) => Observable<B>
    ): Observable<B>;
    pipe<A, B, C>(
        op1: (obs: Observable<T>) => Observable<A>,
        op2: (obs: Observable<A>) => Observable<B>,
        op3: (obs: Observable<B>) => Observable<C>
    ): Observable<C>;
    pipe<A, B, C, D>(
        op1: (obs: Observable<T>) => Observable<A>,
        op2: (obs: Observable<A>) => Observable<B>,
        op3: (obs: Observable<B>) => Observable<C>,
        op4: (obs: Observable<C>) => Observable<D>
    ): Observable<D>;
    pipe(...operators: Array<(obs: Observable<any>) => Observable<any>>): Observable<any>;
}

/**
 * RxJS-compatible Subscription.
 */
export interface Subscription {
    unsubscribe(): void;
    readonly closed: boolean;
}

/**
 * Converts a Polystate store into an RxJS-compatible Observable.
 * 
 * This enables seamless integration with RxJS operators and patterns.
 * Works with both full state and selectors.
 * 
 * @template T - The store state type
 * @param store - The store instance
 * @param selector - Optional selector to pick a slice of state
 * @returns An RxJS-compatible observable
 * 
 * @example
 * ```typescript
 * const store = createStore({ count: 0 }, ...);
 * const observable$ = asObservable(store);
 * 
 * // With RxJS
 * observable$
 *   .pipe(
 *     map(state => state.count),
 *     filter(count => count > 0),
 *     distinctUntilChanged()
 *   )
 *   .subscribe(count => console.log(count));
 * ```
 */
export function asObservable<T>(store: Store<T>): Observable<T>;
export function asObservable<T, S>(store: Store<T>, selector: Selector<T, S>): Observable<S>;
export function asObservable<T, S>(
    store: Store<T>,
    selector?: Selector<T, S>
): Observable<T | S> {
    const obs: Observable<T | S> = {
        subscribe(observerOrNext, error, complete) {
            // Handle both callback and observer patterns
            let observer: Observer<T | S>;

            if (typeof observerOrNext === 'function') {
                observer = {
                    next: observerOrNext,
                    error,
                    complete,
                };
            } else if (observerOrNext !== null && typeof observerOrNext === 'object') {
                observer = observerOrNext;
            } else {
                observer = {};
            }

            // Subscribe to the store
            let unsubscribe: (() => void) | null = null;

            if (selector) {
                unsubscribe = store.subscribe(selector, (value) => {
                    observer.next?.(value);
                });
            } else {
                unsubscribe = store.subscribe((value) => {
                    observer.next?.(value);
                });
            }

            const subscription: Subscription = {
                unsubscribe() {
                    if (unsubscribe) {
                        unsubscribe();
                        unsubscribe = null;
                    }
                },
                get closed() {
                    return unsubscribe === null;
                },
            };

            return subscription;
        },
        pipe(...operators: Array<(obs: Observable<any>) => Observable<any>>): any {
            return operators.reduce((acc, op) => op(acc), obs as Observable<any>);
        },
    };
    return obs;
}

/**
 * Pipes an observable through multiple operators.
 * Useful helper for chaining RxJS operations.
 * 
 * @template T - The observable value type
 * @template R - The result type
 * @param observable - The source observable
 * @param operators - Functions that transform the observable
 * @returns The final observable after all operators are applied
 * 
 * @example
 * ```typescript
 * const store = createStore({ count: 0 }, ...);
 * const observable$ = asObservable(store);
 * 
 * const result$ = pipe(
 *   observable$,
 *   map(state => state.count),
 *   filter(count => count > 0)
 * );
 * ```
 */
export function pipe<T, R>(
    observable: Observable<T>,
    ...operators: Array<(obs: Observable<any>) => Observable<any>>
): Observable<R> {
    let result: Observable<any> = observable;
    for (const operator of operators) {
        result = operator(result);
    }
    return result;
}

/**
 * Map operator for use with asObservable.
 * Transforms each value from the observable.
 * 
 * @template T - The input value type
 * @template R - The transformed value type
 * @param mapFn - Function to transform each value
 * @returns An operator function
 */
export function map<T, R>(mapFn: (value: T) => R) {
    return (source: Observable<T>): Observable<R> => {
        const obs: Observable<R> = {
            subscribe(observer: any) {
                return source.subscribe({
                    next(value: T) {
                        (observer as Observer<R>).next?.(mapFn(value));
                    },
                    error(err: any) {
                        (observer as Observer<R>).error?.(err);
                    },
                    complete() {
                        (observer as Observer<R>).complete?.();
                    },
                });
            },
            pipe(...operators: Array<(obs: Observable<any>) => Observable<any>>): any {
                return operators.reduce((acc, op) => op(acc), obs as Observable<any>);
            },
        };
        return obs;
    };
}

/**
 * Filter operator for use with asObservable.
 * Filters values based on a predicate.
 * 
 * @template T - The value type
 * @param predicate - Function that returns true to keep the value
 * @returns An operator function
 */
export function filter<T>(predicate: (value: T) => boolean) {
    return (source: Observable<T>): Observable<T> => {
        const obs: Observable<T> = {
            subscribe(observer: any) {
                return source.subscribe({
                    next(value: T) {
                        if (predicate(value)) {
                            (observer as Observer<T>).next?.(value);
                        }
                    },
                    error(err: any) {
                        (observer as Observer<T>).error?.(err);
                    },
                    complete() {
                        (observer as Observer<T>).complete?.();
                    },
                });
            },
            pipe(...operators: Array<(obs: Observable<any>) => Observable<any>>): any {
                return operators.reduce((acc, op) => op(acc), obs as Observable<any>);
            },
        };
        return obs;
    };
}

/**
 * DistinctUntilChanged operator for use with asObservable.
 * Emits only when the value changes.
 * 
 * @template T - The value type
 * @param compareFn - Optional comparison function (default: ===)
 * @returns An operator function
 */
export function distinctUntilChanged<T>(compareFn?: (prev: T, curr: T) => boolean) {
    return (source: Observable<T>): Observable<T> => {
        const compare = compareFn ?? ((a: T, b: T) => a === b);
        const obs: Observable<T> = {
            subscribe(observer: any) {
                let prev: T;
                let initialized = false;

                return source.subscribe({
                    next(value: T) {
                        if (!initialized || !compare(prev, value)) {
                            initialized = true;
                            prev = value;
                            (observer as Observer<T>).next?.(value);
                        }
                    },
                    error(err: any) {
                        (observer as Observer<T>).error?.(err);
                    },
                    complete() {
                        (observer as Observer<T>).complete?.();
                    },
                });
            },
            pipe(...operators: Array<(obs: Observable<any>) => Observable<any>>): any {
                return operators.reduce((acc, op) => op(acc), obs as Observable<any>);
            },
        };
        return obs;
    };
}

/**
 * Take operator for use with asObservable.
 * Emits only the first n values.
 * 
 * @template T - The value type
 * @param count - Number of values to emit
 * @returns An operator function
 */
export function take<T>(count: number) {
    return (source: Observable<T>): Observable<T> => {
        const obs: Observable<T> = {
            subscribe(observer: any) {
                let emitted = 0;
                const subscription = source.subscribe({
                    next(value: T) {
                        if (emitted < count) {
                            (observer as Observer<T>).next?.(value);
                            emitted++;
                            if (emitted === count) {
                                (observer as Observer<T>).complete?.();
                                subscription.unsubscribe();
                            }
                        }
                    },
                    error(err: any) {
                        (observer as Observer<T>).error?.(err);
                    },
                    complete() {
                        (observer as Observer<T>).complete?.();
                    },
                });
                return subscription;
            },
            pipe(...operators: Array<(obs: Observable<any>) => Observable<any>>): any {
                return operators.reduce((acc, op) => op(acc), obs as Observable<any>);
            },
        };
        return obs;
    };
}
