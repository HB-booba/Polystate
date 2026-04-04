/**
 * Generated React hooks for todo store
 * Do not edit manually - regenerate with: polystate generate
 */

import { useDispatch, useSelector as useReduxSelector, TypedUseSelectorHook } from 'react-redux';
import { useMemo } from 'react';
import type { RootState, AppDispatch } from './store';
import {
  addTodo,
  toggleTodo,
  removeTodo,
  setFilter,
} from './store';

// ============================================================================
// Typed Hooks
// ============================================================================

export const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;
export const useAppDispatch = () => useDispatch<AppDispatch>();

// ============================================================================
// Store Hooks
// ============================================================================

/**
 * Get the entire todo state
 */
export function useTodoState() {
  return useSelector((state) => state.todo);
}

// ============================================================================
// Field Selector Hooks
// ============================================================================

export function useTodos() {
  return useSelector((state: RootState) => state.todo.todos);
}

export function useFilter() {
  return useSelector((state: RootState) => state.todo.filter);
}

export function useFilteredTodos(): Array<{
            id: number;
            title: string;
            done: boolean;
        }> {
  const todos = useTodos();
  const filter = useFilter();
  if (filter === 'active') return todos.filter((t) => !t.done);
  if (filter === 'completed') return todos.filter((t) => !!t.done);
  return todos;
}

export function useActiveTodoCount(): number {
  return useTodos().filter((t) => !t.done).length;
}

// ============================================================================
// Action Dispatch Hooks
// ============================================================================

/**
 * Get all action dispatchers for todo
 */
export function useTodoDispatch() {
  const dispatch = useAppDispatch();

  return useMemo(
    () => ({
      addTodo: (payload: string) => dispatch(addTodo(payload)),
      toggleTodo: (payload: number) => dispatch(toggleTodo(payload)),
      removeTodo: (payload: number) => dispatch(removeTodo(payload)),
      setFilter: (payload: 'all' | 'active' | 'completed') => dispatch(setFilter(payload)),
    }),
    [dispatch]
  );
}
