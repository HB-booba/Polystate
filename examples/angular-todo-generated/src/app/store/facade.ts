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

type Todo = { id: number; title: string; done: boolean };

@Injectable({ providedIn: 'root' })
export class TodoFacade {
  todos$: Observable<Todo[]> = this.store.pipe(select(fromTodoSelectors.selectTodos));
  filter$: Observable<'all' | 'active' | 'completed'> = this.store.pipe(
    select(fromTodoSelectors.selectFilter)
  );
  filteredTodos$: Observable<Todo[]> = this.store.pipe(
    select(fromTodoSelectors.selectFilteredTodos)
  );
  activeTodoCount$: Observable<number> = this.store.pipe(
    select(fromTodoSelectors.selectActiveTodoCount)
  );
  completedTodoCount$: Observable<number> = this.store.pipe(
    select(fromTodoSelectors.selectCompletedTodoCount)
  );

  constructor(private store: Store<{ todo: TodoState }>) {}

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
