/**
 * Generated React hooks for todo store
 * Do not edit manually - regenerate with: polystate generate
 */

import { useMemo } from 'react';
import {
    TypedUseSelectorHook,
    useDispatch,
    useSelector as useReduxSelector,
} from 'react-redux';
import type { AppDispatch, RootState } from './store';
import {
    addTodo,
    removeTodo,
    selectActiveTodoCount,
    selectCompletedTodoCount,
    selectFilter,
    selectFilteredTodos,
    selectTodos,
    setFilter,
    toggleTodo,
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
            addTodo: (title: string) => dispatch(addTodo(title)),
            toggleTodo: (id: number) => dispatch(toggleTodo(id)),
            removeTodo: (id: number) => dispatch(removeTodo(id)),
            setFilter: (filter: string) => dispatch(setFilter(filter)),
        }),
        [dispatch]
    );
}

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get all todos
 */
export function useTodos() {
    return useSelector(selectTodos);
}

/**
 * Get current filter
 */
export function useFilter() {
    return useSelector(selectFilter);
}

/**
 * Get filtered todos
 */
export function useFilteredTodos() {
    return useSelector(selectFilteredTodos);
}

/**
 * Get count of active (uncompleted) todos
 */
export function useActiveTodoCount() {
    return useSelector(selectActiveTodoCount);
}

/**
 * Get count of completed todos
 */
export function useCompletedTodoCount() {
    return useSelector(selectCompletedTodoCount);
}
