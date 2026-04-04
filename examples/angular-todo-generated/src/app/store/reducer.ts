/**
 * Generated NgRx reducer for todo store
 * Do not edit manually - regenerate with: polystate generate
 */

import { createReducer, on } from '@ngrx/store';
import * as TodoActions from './actions';
import { TodoState } from './state';

export const initialState: TodoState = {
  todos: [],
  filter: "all",
};

export const todoReducer = createReducer(
  initialState,
  on(TodoActions.addTodo, (state, { payload }) => {
    const title = payload;
    return ({
            ...state,
            todos: [
                ...state.todos,
                {
                    id: Date.now(),
                    title,
                    done: false,
                },
            ],
        });
  }),
  on(TodoActions.toggleTodo, (state, { payload }) => {
    const id = payload;
    return ({
            ...state,
            todos: state.todos.map((t) =>
                t.id === id ? { ...t, done: !t.done } : t
            ),
        });
  }),
  on(TodoActions.removeTodo, (state, { payload }) => {
    const id = payload;
    return ({
            ...state,
            todos: state.todos.filter((t) => t.id !== id),
        });
  }),
  on(TodoActions.setFilter, (state, { payload }) => {
    const filter = payload;
    return ({
            ...state,
            filter,
        });
  }),
);
