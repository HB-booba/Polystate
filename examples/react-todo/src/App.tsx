import { createStore } from '@polystate/core';
import { connectDevTools } from '@polystate/devtools';
import { createStoreHooks } from '@polystate/react';
import { useState } from 'react';

/**
 * Todo item interface
 */
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

/**
 * Store state interface
 */
interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

/**
 * Create the todo store with actions
 */
const todoStore = createStore<TodoState>(
  { todos: [], filter: 'all' },
  {
    addTodo: (state, text: string) => ({
      ...state,
      todos: [
        ...state.todos,
        {
          id: Date.now(),
          text,
          completed: false,
        },
      ],
    }),
    removeTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.filter((todo) => todo.id !== id),
    }),
    toggleTodo: (state, id: number) => ({
      ...state,
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    }),
    setFilter: (state, filter: 'all' | 'active' | 'completed') => ({
      ...state,
      filter,
    }),
  }
);

// Wire up Redux DevTools. Open the browser extension to inspect and time-travel.
connectDevTools(todoStore, { name: 'TodoStore', timeTravel: true });

/**
 * Create pre-bound hooks for easier usage
 */
const { useDispatch: useTodoDispatch, useSelector: useTodoSelector } =
  createStoreHooks(todoStore);

/**
 * Filter todos based on current filter
 */
function getFilteredTodos(todos: Todo[], filter: string): Todo[] {
  switch (filter) {
    case 'active':
      return todos.filter((todo) => !todo.completed);
    case 'completed':
      return todos.filter((todo) => todo.completed);
    default:
      return todos;
  }
}

/**
 * AddTodo component
 */
function AddTodo() {
  const [input, setInput] = useState('');
  const { dispatch } = useTodoDispatch();

  const handleAddTodo = () => {
    if (input.trim()) {
      dispatch('addTodo', input);
      setInput('');
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
        placeholder="Add a new todo..."
        style={{
          padding: '8px',
          marginRight: '8px',
          borderRadius: '4px',
          border: '1px solid #ddd',
        }}
      />
      <button
        onClick={handleAddTodo}
        style={{
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Add
      </button>
    </div>
  );
}

/**
 * Todo list component
 */
function TodoList() {
  const todos = useTodoSelector((state) => state.todos);
  const filter = useTodoSelector((state) => state.filter);
  const { dispatch } = useTodoDispatch();

  const filteredTodos = getFilteredTodos(todos, filter);

  return (
    <div>
      <h2>
        Todos ({filteredTodos.length}/{todos.length})
      </h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {filteredTodos.map((todo) => (
          <li
            key={todo.id}
            style={{
              padding: '12px',
              backgroundColor: '#f5f5f5',
              marginBottom: '8px',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => dispatch('toggleTodo', todo.id)}
              />
              <span
                style={{
                  textDecoration: todo.completed ? 'line-through' : 'none',
                  opacity: todo.completed ? 0.6 : 1,
                }}
              >
                {todo.text}
              </span>
            </div>
            <button
              onClick={() => dispatch('removeTodo', todo.id)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Filter buttons component
 */
function FilterButtons() {
  const currentFilter = useTodoSelector((state) => state.filter);
  const { dispatch } = useTodoDispatch();

  const filters: Array<'all' | 'active' | 'completed'> = ['all', 'active', 'completed'];

  return (
    <div style={{ marginTop: '20px', marginBottom: '20px' }}>
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => dispatch('setFilter', filter)}
          style={{
            padding: '8px 12px',
            marginRight: '8px',
            backgroundColor: currentFilter === filter ? '#007bff' : '#e9ecef',
            color: currentFilter === filter ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            textTransform: 'capitalize',
          }}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

/**
 * Main app component
 */
export function App() {
  return (
    <div
      style={{
        maxWidth: '500px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1>Polystate Todo App</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        A simple todo app built with Polystate and React
      </p>

      <AddTodo />
      <FilterButtons />
      <TodoList />

      <div
        style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#f0f8ff',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#333',
        }}
      >
        <p>
          <strong>How it works:</strong>
        </p>
        <ul style={{ marginTop: '10px', marginBottom: '10px' }}>
          <li>Store state is managed by Polystate</li>
          <li>Components use useSelector to subscribe to state slices</li>
          <li>useDispatch provides action dispatchers</li>
          <li>Only components with changed selectors re-render</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
