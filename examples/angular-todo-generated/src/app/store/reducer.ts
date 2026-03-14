/**
 * Generated NgRx reducer for todo store
 * Do not edit manually - regenerate with: polystate generate
 */

import { createReducer, on } from '@ngrx/store';
import * as TodoActions from './actions';
import { TodoState } from './state';

export const initialState: TodoState = {
    todos: [],
    filter: 'all',
};

export const todoReducer = createReducer(
    initialState,
    on(TodoActions.addTodo, (state, { payload }) => ({
        ...state,
        todos: [
            ...state.todos,
            {
                id: Date.now(),
                title: payload,
                done: false,
            },
        ],
    })),
    on(TodoActions.toggleTodo, (state, { payload }) => ({
        ...state,
        todos: state.todos.map((t) =>
            t.id === payload ? { ...t, done: !t.done } : t
        ),
    })),
    on(TodoActions.removeTodo, (state, { payload }) => ({
        ...state,
        todos: state.todos.filter((t) => t.id !== payload),
    })),
    on(TodoActions.setFilter, (state, { payload }) => ({
        ...state,
        filter: payload as any,
    }))
);
