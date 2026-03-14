/**
 * Generated NgRx actions for todo store
 * Do not edit manually - regenerate with: polystate generate
 */

import { createAction, props } from '@ngrx/store';

export const addTodo = createAction(
    '[Todo] addTodo',
    props<{ payload: string }>()
);

export const toggleTodo = createAction(
    '[Todo] toggleTodo',
    props<{ payload: number }>()
);

export const removeTodo = createAction(
    '[Todo] removeTodo',
    props<{ payload: number }>()
);

export const setFilter = createAction(
    '[Todo] setFilter',
    props<{ payload: string }>()
);
