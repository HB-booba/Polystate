/**
 * Generated Redux store for todo
 * Do not edit manually - regenerate with: polystate generate
 */

import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

// ============================================================================
// State Type
// ============================================================================

export interface TodoState {
    todos: Array<{
        id: number;
        title: string;
        done: boolean;
    }>;
    filter: 'all' | 'active' | 'completed';
}

// ============================================================================
// Slice
// ============================================================================

const initialState: TodoState = {
    todos: [],
    filter: 'all',
};

const todoSlice = createSlice({
    name: 'todo',
    initialState,
    reducers: {
        addTodo: (state, action: PayloadAction<string>) => {
            state.todos.push({
                id: Date.now(),
                title: action.payload,
                done: false,
            });
        },
        toggleTodo: (state, action: PayloadAction<number>) => {
            const todo = state.todos.find((t) => t.id === action.payload);
            if (todo) {
                todo.done = !todo.done;
            }
        },
        removeTodo: (state, action: PayloadAction<number>) => {
            state.todos = state.todos.filter((t) => t.id !== action.payload);
        },
        setFilter: (state, action: PayloadAction<string>) => {
            state.filter = action.payload as any;
        },
    },
});

// ============================================================================
// Actions
// ============================================================================

export const { addTodo, toggleTodo, removeTodo, setFilter } = todoSlice.actions;

// ============================================================================
// Selectors
// ============================================================================

const selectTodoState = (state: RootState) => state.todo;

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

// ============================================================================
// Store Configuration
// ============================================================================

export const store = configureStore({
    reducer: {
        todo: todoSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(loggerMiddleware)
            .concat(persistMiddleware),
    devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ============================================================================
// Middleware
// ============================================================================

function loggerMiddleware(store: any) {
    return (next: any) => (action: any) => {
        console.log('[todo] Action:', action.type, action.payload);
        const result = next(action);
        console.log('[todo] New State:', store.getState());
        return result;
    };
}

function persistMiddleware(store: any) {
    return (next: any) => (action: any) => {
        const result = next(action);
        localStorage.setItem('polystate_todo', JSON.stringify(store.getState().todo));
        return result;
    };
}

// Load persisted state on startup
const persistedState = localStorage.getItem('polystate_todo');
if (persistedState) {
    try {
        const parsed = JSON.parse(persistedState);
        const state = store.getState();
        store.dispatch({ type: '@@redux/INIT' } as any);
    } catch (e) {
        console.error('Failed to load persisted state:', e);
    }
}
