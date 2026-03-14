/**
 * Generated NgRx selectors for todo store
 * Do not edit manually - regenerate with: polystate generate
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TodoState } from './state';

export const selectTodoState = createFeatureSelector<TodoState>('todo');

export const selectTodos = createSelector(
    selectTodoState,
    (state: TodoState) => state.todos
);

export const selectFilter = createSelector(
    selectTodoState,
    (state: TodoState) => state.filter
);

export const selectFilteredTodos = createSelector(
    selectTodos,
    selectFilter,
    (todos, filter) => {
        if (filter === 'active') return todos.filter((t) => !t.done);
        if (filter === 'completed') return todos.filter((t) => t.done);
        return todos;
    }
);

export const selectActiveTodoCount = createSelector(
    selectTodos,
    (todos) => todos.filter((t) => !t.done).length
);

export const selectCompletedTodoCount = createSelector(
    selectTodos,
    (todos) => todos.filter((t) => t.done).length
);
