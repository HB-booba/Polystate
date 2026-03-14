import React, { useState } from 'react';
import './App.css';
import {
    useActiveTodoCount,
    useFilter,
    useFilteredTodos,
    useTodoDispatch,
} from './store/hooks';

/**
 * Todo Application
 * Demonstrates Polystate code generation for React + Redux
 */
export function App() {
  const [title, setTitle] = useState('');
  const todos = useFilteredTodos();
  const filter = useFilter();
  const activeCount = useActiveTodoCount();
  const { addTodo, toggleTodo, removeTodo, setFilter } = useTodoDispatch();

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      addTodo(title);
      setTitle('');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📝 Todo App</h1>
        <p className="subtitle">
          Built with Polystate Generated Redux + React
        </p>
      </header>

      <main className="app-main">
        {/* Add Todo Form */}
        <form onSubmit={handleAddTodo} className="add-todo-form">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new todo..."
            className="todo-input"
          />
          <button type="submit" className="add-button">
            Add Todo
          </button>
        </form>

        {/* Filter Buttons */}
        <div className="filter-buttons">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              className={`filter-button ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Todo List */}
        <div className="todo-list">
          {todos.length === 0 ? (
            <p className="empty-message">
              {filter === 'all'
                ? 'No todos yet. Add one to get started!'
                : `No ${filter} todos.`}
            </p>
          ) : (
            todos.map((todo) => (
              <div key={todo.id} className="todo-item">
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => toggleTodo(todo.id)}
                  className="todo-checkbox"
                />
                <span className={`todo-title ${todo.done ? 'done' : ''}`}>
                  {todo.title}
                </span>
                <button
                  onClick={() => removeTodo(todo.id)}
                  className="remove-button"
                  aria-label="Remove todo"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {/* Stats */}
        {todos.length > 0 && (
          <div className="stats">
            <span>{activeCount} active</span>
            <span>·</span>
            <span>{todos.length - activeCount} completed</span>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
