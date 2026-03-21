import type { ActionHandler, ActionMap } from './store';

/**
 * Options for createSlice.
 * @template T - The slice state type
 */
export interface SliceOptions {
  /** Optional name for debugging */
  name?: string;
}

/**
 * A slice containing reducers and initial state.
 * @template T - The slice state type
 */
export interface Slice<T> {
  /** The initial state for this slice */
  initialState: T;
  /** Action handlers for this slice */
  actions: ActionMap<T>;
  /** Slice name for debugging */
  name?: string;
}

/**
 * Creates a slice with reducers and initial state (Redux Toolkit style).
 *
 * Slices are useful for organizing state logic into modular, reusable chunks.
 * Each slice can be composed into a larger store.
 *
 * @template T - The type of the slice state
 * @param initialState - The initial state for this slice
 * @param reducers - Object mapping action names to reducer functions
 * @param options - Optional configuration
 * @returns An object with initialState and actions
 *
 * @example
 * ```typescript
 * // Create a counter slice
 * const counterSlice = createSlice(
 *   { count: 0 },
 *   {
 *     increment: (state) => ({ ...state, count: state.count + 1 }),
 *     decrement: (state) => ({ ...state, count: state.count - 1 }),
 *     incrementByAmount: (state, amount: number) => ({
 *       ...state,
 *       count: state.count + amount,
 *     }),
 *   },
 *   { name: 'counter' }
 * );
 *
 * // Use in a store
 * const store = createStore(
 *   { counter: counterSlice.initialState, todos: [] },
 *   {
 *     ...prefixActions(counterSlice.actions, 'counter'),
 *     addTodo: (state, todo) => ({
 *       ...state,
 *       todos: [...state.todos, todo],
 *     }),
 *   }
 * );
 *
 * // Dispatch counter actions
 * store.dispatch('counter/increment');
 * store.dispatch('counter/incrementByAmount', 5);
 * ```
 */
export function createSlice<T>(
  initialState: T,
  reducers: Record<string, ActionHandler<T>>,
  options?: SliceOptions
): Slice<T> {
  return {
    initialState,
    actions: reducers,
    name: options?.name,
  };
}

/**
 * Prefixes action names with a given prefix, useful for namespacing slice actions.
 *
 * @template T - The state type
 * @param actions - Action map to prefix
 * @param prefix - Prefix to add to action names
 * @returns New action map with prefixed names
 *
 * @example
 * ```typescript
 * const counterActions = {
 *   increment: (state) => ({ ...state, count: state.count + 1 }),
 * };
 *
 * const prefixed = prefixActions(counterActions, 'counter');
 * // Result: { 'counter/increment': (fullState, payload) => ({ ...fullState, counter: handler(fullState.counter, payload) }) }
 * ```
 */
export function prefixActions<TSlice, TFull extends Record<string, any> = Record<string, any>>(
  actions: ActionMap<TSlice>,
  prefix: string
): ActionMap<TFull> {
  const result: ActionMap<TFull> = {};
  Object.entries(actions).forEach(([name, handler]) => {
    result[`${prefix}/${name}`] = (fullState: TFull, payload) => ({
      ...fullState,
      [prefix]: handler((fullState as any)[prefix], payload),
    });
  });
  return result;
}

/**
 * Composes multiple slices into action maps that can be merged.
 *
 * @param slices - Array of slices to compose
 * @returns Array of action maps ready to merge into a store
 *
 * @example
 * ```typescript
 * const counterSlice = createSlice(
 *   { count: 0 },
 *   { increment: (s) => ({ ...s, count: s.count + 1 }) }
 * );
 *
 * const todosSlice = createSlice(
 *   { todos: [] },
 *   { addTodo: (s, title) => ({ ...s, todos: [...s.todos, title] }) }
 * );
 *
 * const [counterState, todoState] = composeSlices([
 *   counterSlice,
 *   todosSlice,
 * ]);
 *
 * // Now merge into store
 * const store = createStore(
 *   { ...counterState.initialState, ...todosState.initialState },
 *   { ...counterState.actions, ...todoState.actions }
 * );
 * ```
 */
export function composeSlices<T extends Slice<any>>(
  slices: T[]
): Array<{ initialState: any; actions: ActionMap<any> }> {
  return slices.map((slice) => ({
    initialState: slice.initialState,
    actions: slice.actions,
  }));
}
