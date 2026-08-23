/**
 * Generated types for todo store
 * Do not edit manually - regenerate with: polystate generate
 */

export interface TodoState {
  todos: Array<{
            id: number;
            title: string;
            done: boolean;
        }>;
  filter: 'all' | 'active' | 'completed';
}

export interface TodoActions {
  addTodo(payload: string): void;
  toggleTodo(payload: number): void;
  removeTodo(payload: number): void;
  setFilter(payload: 'all' | 'active' | 'completed'): void;
}
