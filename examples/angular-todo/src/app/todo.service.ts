import { Injectable } from '@angular/core';
import { createAngularService } from '@polystate/angular';
import { combineLatest, map } from 'rxjs';

export interface Todo {
    id: number;
    title: string;
    done: boolean;
}

export interface TodoState {
    todos: Todo[];
    filter: 'all' | 'active' | 'completed';
}

const initialState: TodoState = {
    todos: [],
    filter: 'all',
};

const actions = {
    addTodo: (state: TodoState, title: unknown) => ({
        ...state,
        todos: [...state.todos, { id: Date.now(), title: title as string, done: false }],
    }),
    toggleTodo: (state: TodoState, id: unknown) => ({
        ...state,
        todos: state.todos.map((t) =>
            t.id === (id as number) ? { ...t, done: !t.done } : t
        ),
    }),
    removeTodo: (state: TodoState, id: unknown) => ({
        ...state,
        todos: state.todos.filter((t) => t.id !== (id as number)),
    }),
    setFilter: (state: TodoState, filter: unknown) => ({
        ...state,
        filter: filter as 'all' | 'active' | 'completed',
    }),
};

@Injectable({ providedIn: 'root' })
export class TodoService extends createAngularService<TodoState>(initialState, actions) {
    /** Stream of all todos. */
    todos$ = this.select$((state) => state.todos);

    /** Stream of the active filter. */
    filter$ = this.select$((state) => state.filter);

    /** Stream of todos filtered by the active filter. */
    filteredTodos$ = combineLatest([this.todos$, this.filter$]).pipe(
        map(([todos, filter]) => {
            if (filter === 'active') return todos.filter((t) => !t.done);
            if (filter === 'completed') return todos.filter((t) => t.done);
            return todos;
        })
    );
}
