import { describe, expect, it } from 'vitest';
import { composeSlices, createSlice, prefixActions } from './slice';
import { createStore } from './store';

describe('Slices', () => {
  it('should create a slice with initial state and actions', () => {
    const counterSlice = createSlice(
      { count: 0 },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
        decrement: (state) => ({ ...state, count: state.count - 1 }),
      },
      { name: 'counter' }
    );

    expect(counterSlice.initialState).toEqual({ count: 0 });
    expect(counterSlice.actions).toHaveProperty('increment');
    expect(counterSlice.actions).toHaveProperty('decrement');
    expect(counterSlice.name).toBe('counter');
  });

  it('should prefix action names', async () => {
    const actions = {
      increment: (state: { count: number }) => ({ count: state.count + 1 }),
      decrement: (state: { count: number }) => ({ count: state.count - 1 }),
    };

    const prefixed = prefixActions(actions, 'counter');

    expect(prefixed).toHaveProperty('counter/increment');
    expect(prefixed).toHaveProperty('counter/decrement');
    expect(prefixed).not.toHaveProperty('increment');
  });

  it('should work with createStore for modular state', async () => {
    const counterSlice = createSlice(
      { count: 0 },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
      }
    );

    const todosSlice = createSlice(
      { todos: [] as string[] },
      {
        addTodo: (state, title: string) => ({
          ...state,
          todos: [...state.todos, title],
        }),
      }
    );

    const store = createStore(
      {
        counter: counterSlice.initialState,
        todos: todosSlice.initialState,
      },
      {
        ...prefixActions(counterSlice.actions, 'counter'),
        ...prefixActions(todosSlice.actions, 'todos'),
      }
    );

    expect(store.getState()).toEqual({
      counter: { count: 0 },
      todos: { todos: [] },
    });

    await store.dispatch('counter/increment');
    expect(store.getState()).toEqual({
      counter: { count: 1 },
      todos: { todos: [] },
    });

    await store.dispatch('todos/addTodo', 'Learn Polystate');
    expect(store.getState()).toEqual({
      counter: { count: 1 },
      todos: { todos: ['Learn Polystate'] },
    });
  });

  it('should compose multiple slices', () => {
    const counterSlice = createSlice(
      { count: 0 },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
      }
    );

    const todosSlice = createSlice(
      { todos: [] as string[] },
      {
        addTodo: (state, title: string) => ({
          ...state,
          todos: [...state.todos, title],
        }),
      }
    );

    const composed = composeSlices([counterSlice, todosSlice]);

    expect(composed).toHaveLength(2);
    expect(composed[0].initialState).toEqual({ count: 0 });
    expect(composed[1].initialState).toEqual({ todos: [] });
  });

  it('should handle action handlers with payloads in slices', async () => {
    const userSlice = createSlice(
      { name: 'John', age: 30 },
      {
        setName: (state, name: string) => ({ ...state, name }),
        setAge: (state, age: number) => ({ ...state, age }),
      }
    );

    const store = createStore(
      { user: userSlice.initialState },
      prefixActions(userSlice.actions, 'user')
    );

    await store.dispatch('user/setName', 'Alice');
    expect(store.getState().user.name).toBe('Alice');

    await store.dispatch('user/setAge', 25);
    expect(store.getState().user.age).toBe(25);
  });

  it('prefixActions scopes handler to sub-state — dispatch must not produce NaN or wrong key', async () => {
    const counterSlice = createSlice(
      { count: 0 },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
        add: (state, n: number) => ({ ...state, count: state.count + n }),
      }
    );

    const store = createStore(
      { counter: counterSlice.initialState, other: 'unchanged' },
      prefixActions(counterSlice.actions, 'counter')
    );

    await store.dispatch('counter/increment');
    // count must be 1, not 0 or NaN
    expect(store.getState().counter.count).toBe(1);
    // unrelated key must be untouched
    expect(store.getState().other).toBe('unchanged');
    // no spurious top-level 'count' key
    expect((store.getState() as any).count).toBeUndefined();

    await store.dispatch('counter/add', 10);
    expect(store.getState().counter.count).toBe(11);
  });
});
