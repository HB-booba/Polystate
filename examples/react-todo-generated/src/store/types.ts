/**
 * Generated types for todo store
 * Do not edit manually - regenerate with: polystate generate
 */

export interface TodoState {
  todos: any[];
  filter: string;
}

export interface TodoActions {
  addTodo(payload: any): void;
  toggleTodo(payload: any): void;
  removeTodo(payload: any): void;
  setFilter(payload: any): void;
}
