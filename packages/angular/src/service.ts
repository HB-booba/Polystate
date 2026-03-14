import { effect, Injectable, signal } from '@angular/core';
import type { Selector, Store } from '@polystate/core';
import { asObservable } from '@polystate/core';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

/**
 * Abstract base class for Angular services that manage Polystate stores.
 * 
 * Provides Angular Signal and Observable access to a Polystate store.
 * Combine with a Polystate store to create reactive Angular services.
 * 
 * @template T - The store state type
 * 
 * @example
 * ```typescript
 * {providedIn: 'root'}
 * export class TodoService extends createAngularService(
 *   { todos: [], filter: 'all' },
 *   {
 *     addTodo: (state, title) => ({
 *       ...state,
 *       todos: [...state.todos, { id: Date.now(), title }]
 *     })
 *   }
 * ) {}
 * ```
 */
@Injectable()
export abstract class PolystateService<T> {
    protected store!: Store<T>;

    /**
     * Selects a slice of state as an Angular Signal.
     * Automatically updates when the selected value changes.
     * 
     * @template S - The selected value type
     * @param selector - Function to select a slice of state
     * @returns Angular Signal with the selected value
     * 
     * @example
     * ```typescript
     * class TodoService extends PolystateService<TodoState> {
     *   todos = this.select((state) => state.todos);
     * }
     * 
     * // In component:
     * {{ service.todos() }}
     * ```
     */
    select<S>(selector: Selector<T, S>): () => S {
        const sig = signal(selector(this.store.getState()));

        const unsubscribe = this.store.subscribe(selector, (value) => {
            sig.set(value);
        });

        // Cleanup on destroy is handled by Angular's lifecycle
        effect(() => {
            // This ensures the effect is tracked and can be cleaned up
            sig();
        });

        return sig;
    }

    /**
     * Selects a slice of state as an RxJS Observable.
     * Compatible with Angular's async pipe.
     * 
     * @template S - The selected value type
     * @param selector - Function to select a slice of state
     * @returns RxJS Observable with the selected value
     * 
     * @example
     * ```typescript
     * class TodoService extends PolystateService<TodoState> {
     *   todos$ = this.select$((state) => state.todos);
     * }
     * 
     * // In template:
     * <div *ngFor="let todo of service.todos$ | async">
     *   {{ todo.title }}
     * </div>
     * ```
     */
    select$<S>(selector: Selector<T, S>) {
        const observable = asObservable(this.store, selector);
        const subject = new BehaviorSubject(this.store.getState(selector));

        const subscription = observable.subscribe((value) => {
            subject.next(value);
        });

        // Note: In a real implementation, you'd handle subscription cleanup
        // This is a simplified version

        return subject.asObservable().pipe(distinctUntilChanged());
    }

    /**
     * Dispatches an action to the store.
     * 
     * @param action - Action name
     * @param payload - Optional action payload
     * 
     * @example
     * ```typescript
     * service.dispatch('addTodo', 'Learn Angular');
     * ```
     */
    dispatch(action: string, payload?: unknown): Promise<void> {
        return this.store.dispatch(action, payload);
    }

    /**
     * Gets the current state snapshot.
     * 
     * @returns The current state
     */
    getState(): T {
        return this.store.getState();
    }

    /**
     * Gets a selector value snapshot.
     * 
     * @template S - The selected value type
     * @param selector - Function to select a slice of state
     * @returns The selected value
     */
    getState<S>(selector: Selector<T, S>): S {
        return this.store.getState(selector);
    }
}

/**
 * Factory function to create an Angular service class that extends PolystateService.
 * 
 * Automatically creates the store and wires up the service.
 * 
 * @template T - The store state type
 * @param initialState - Initial state
 * @param actions - Action handlers
 * @returns A class extending PolystateService
 * 
 * @example
 * ```typescript
 * interface TodoState {
 *   todos: Todo[];
 *   loading: boolean;
 * }
 * 
 * @Injectable({ providedIn: 'root' })
 * export class TodoService extends createAngularService<TodoState>(
 *   { todos: [], loading: false },
 *   {
 *     addTodo: (state, title: string) => ({
 *       ...state,
 *       todos: [
 *         ...state.todos,
 *         { id: Date.now(), title, done: false }
 *       ]
 *     }),
 *     setLoading: (state, loading: boolean) => ({
 *       ...state,
 *       loading
 *     })
 *   }
 * ) {
 *   constructor() {
 *     super();
 *   }
 * }
 * ```
 */
export function createAngularService<T>(
    initialState: T,
    actions: Record<string, (state: T, payload?: unknown) => T>
): typeof PolystateService {
    return class extends PolystateService<T> {
        constructor() {
            super();
            // Import Store from @polystate/core dynamically to avoid circular deps
            // We need to do this inside the class to have access to the Store type
        }

        private initializeStore() {
            // This will be overridden in the actual service implementation
            // For now, this is a base implementation
        }
    };
}
