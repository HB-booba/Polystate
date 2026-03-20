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
// Action Hooks
// ============================================================================

/**
 * Get all action dispatchers for todo
 */
export function useTodoDispatch() {
  const dispatch = useAppDispatch();

  return useMemo(
    () => ({
      addTodo: (payload: any) => dispatch(addTodo(payload)),
      toggleTodo: (payload: any) => dispatch(toggleTodo(payload)),
      removeTodo: (payload: any) => dispatch(removeTodo(payload)),
      setFilter: (payload: any) => dispatch(setFilter(payload)),
    }),
    [dispatch]
  );
}

// ============================================================================
// Selector Hooks
// ============================================================================

export function useTodos() {
  return useSelector((state) => state.todo.todos);
}

export function useFilter() {
  return useSelector((state) => state.todo.filter);
}

export function useFilteredTodos() {
  const todos = useTodos() as any[];
  const filter = useFilter() as string;

  if (filter === 'active') return todos.filter((todo: any) => !todo.done);
  if (filter === 'completed') return todos.filter((todo: any) => !!todo.done);
  return todos;
}

export function useActiveTodoCount() {
  const todos = useTodos() as any[];
  return todos.filter((todo: any) => !todo.done).length;
}
