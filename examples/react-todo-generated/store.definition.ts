/**
 * Todo Store Definition
 * Framework-agnostic definition that generates React Redux or Angular NgRx code
 */

import { StoreDefinition } from '@polystate/definition';

export const todoDefinition: StoreDefinition = {
    name: 'todo',
    initialState: {
        todos: [] as Array<{
            id: number;
            title: string;
            done: boolean;
        }>,
        filter: 'all' as 'all' | 'active' | 'completed',
    },
    actions: {
        addTodo: (state, title: string) => ({
            ...state,
            todos: [
                ...state.todos,
                {
                    id: Date.now(),
                    title,
                    done: false,
                },
            ],
        }),
        toggleTodo: (state, id: number) => ({
            ...state,
            todos: state.todos.map((t) =>
                t.id === id ? { ...t, done: !t.done } : t
            ),
        }),
        removeTodo: (state, id: number) => ({
            ...state,
            todos: state.todos.filter((t) => t.id !== id),
        }),
        setFilter: (state, filter: 'all' | 'active' | 'completed') => ({
            ...state,
            filter,
        }),
    },
    description: 'Todo application store with filtering',
};

export default todoDefinition;
