/**
 * Generated Angular Facade Service for todo store
 * Simplifies component interaction with NgRx store
 * Do not edit manually - regenerate with: polystate generate
 */

import { Injectable } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as TodoActions from './actions';
import * as fromTodoSelectors from './selectors';
import { TodoState } from './state';

@Injectable({ providedIn: 'root' })
export class TodoFacade {
    // ========================================================================
    // Selectors (as Observables)
    // ========================================================================

    todos$: Observable<any> = this.store.pipe(
        select(fromTodoSelectors.selectTodos)
    );

    filter$: Observable<any> = this.store.pipe(
        select(fromTodoSelectors.selectFilter)
    );

    filteredTodos$: Observable<any> = this.store.pipe(
        select(fromTodoSelectors.selectFilteredTodos)
    );

    activeTodoCount$: Observable<any> = this.store.pipe(
        select(fromTodoSelectors.selectActiveTodoCount)
    );

    completedTodoCount$: Observable<any> = this.store.pipe(
        select(fromTodoSelectors.selectCompletedTodoCount)
    );

    constructor(private store: Store<{ todo: TodoState }>) { }

    // ========================================================================
    // Actions (as methods)
    // ========================================================================

    addTodo(payload: string): void {
        this.store.dispatch(TodoActions.addTodo({ payload }));
    }

    toggleTodo(payload: number): void {
        this.store.dispatch(TodoActions.toggleTodo({ payload }));
    }

    removeTodo(payload: number): void {
        this.store.dispatch(TodoActions.removeTodo({ payload }));
    }

    setFilter(payload: string): void {
        this.store.dispatch(TodoActions.setFilter({ payload }));
    }
}
