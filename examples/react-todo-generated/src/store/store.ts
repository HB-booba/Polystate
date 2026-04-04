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
  filter: "all",
};

const todoSlice = createSlice({
  name: 'todo',
  initialState,
  reducers: {
    addTodo: (state, action: PayloadAction<string>) => {
      const title = action.payload;
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
    },
    toggleTodo: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      return ({
            ...state,
            todos: state.todos.map((t) =>
                t.id === id ? { ...t, done: !t.done } : t
            ),
        });
    },
    removeTodo: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      return ({
            ...state,
            todos: state.todos.filter((t) => t.id !== id),
        });
    },
    setFilter: (state, action: PayloadAction<'all' | 'active' | 'completed'>) => {
      const filter = action.payload;
      return ({
            ...state,
            filter,
        });
    },
  },
});

// ============================================================================
// Actions
// ============================================================================

export const {
  addTodo,
  toggleTodo,
  removeTodo,
  setFilter,
} = todoSlice.actions;

// ============================================================================
// Selectors
// ============================================================================

const selectTodoState = (state: RootState) => state.todo;

export const selectTodos = createSelector(
  selectTodoState,
  (state) => state.todos
);

export const selectFilter = createSelector(
  selectTodoState,
  (state) => state.filter
);

// ============================================================================
// Store Configuration
// ============================================================================

export const store = configureStore({
  reducer: {
    todo: todoSlice.reducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
