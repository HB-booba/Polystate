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
  todos: any[];
  filter: string;
}

// ============================================================================
// Slice
// ============================================================================

const initialState: TodoState = {
  "todos": [],
  "filter": "all"
};

const todoSlice = createSlice({
  name: 'todo',
  initialState,
  reducers: {
    addTodo: (state, action: PayloadAction<any>) => {
      state.todos.push({
                    id: Date.now(),
                    title: action.payload,
                    done: false,
                });
    },
    toggleTodo: (state, action: PayloadAction<any>) => {
      return { ...state, ...((state, id) => ({
            ...state,
            todos: state.todos.map((t) => t.id === id ? { ...t, done: !t.done } : t),
        }))(state, action.payload) };
    },
    removeTodo: (state, action: PayloadAction<any>) => {
      state.todos = state.todos.filter((t) => t.id !== action.payload);
    },
    setFilter: (state, action: PayloadAction<any>) => {
      state.filter = action.payload;
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
    localStorage.setItem(
      'polystate_todo',
      JSON.stringify(store.getState().todo)
    );
    return result;
  };
}

// Load persisted state on startup
const persistedState = localStorage.getItem('polystate_todo');
if (persistedState) {
  try {
    const parsed = JSON.parse(persistedState);
    store.dispatch({ type: 'SET_STATE', payload: parsed } as any);
  } catch (e) {
    console.error('Failed to load persisted state:', e);
  }
}
