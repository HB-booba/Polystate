/**
 * Generated Angular Facade Service for todo store
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

  todos$: Observable<Array<{
            id: number;
            title: string;
            done: boolean;
        }>> = this.store.pipe(
    select(fromTodoSelectors.selectTodos)
  );

  filter$: Observable<'all' | 'active' | 'completed'> = this.store.pipe(
    select(fromTodoSelectors.selectFilter)
  );

  constructor(private store: Store<{ todo: TodoState }>) {}

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

  setFilter(payload: 'all' | 'active' | 'completed'): void {
    this.store.dispatch(TodoActions.setFilter({ payload }));
  }
}
