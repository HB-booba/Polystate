/**
 * Generated NgRx selectors for todo store
 * Do not edit manually - regenerate with: polystate generate
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TodoState } from './state';

export const selectTodoState = createFeatureSelector<TodoState>(
  'todo'
);

export const selectTodos = createSelector(
  selectTodoState,
  (state: TodoState) => state.todos
);

export const selectFilter = createSelector(
  selectTodoState,
  (state: TodoState) => state.filter
);
