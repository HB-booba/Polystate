import type { Store } from './store';

/**
 * A dispatched action, shorn down to what's needed to replay it. Structurally
 * compatible with the DevTools action-history format (`@polystate/devtools`'s
 * `DevToolsAction`, which also carries a `timestamp`) — a history exported
 * from there can be passed to {@link replayActions} as-is.
 */
export interface RecordedAction {
  type: string;
  payload?: unknown;
}

/**
 * Handle returned by {@link recordActions}.
 */
export interface ActionRecorder {
  /**
   * Stops recording and returns every action dispatched to the store while
   * active, in dispatch order.
   */
  stop(): RecordedAction[];
}

/**
 * Records every action dispatched to `store` from this point on — for
 * capturing a real interaction (a manual QA session, an existing test
 * flow) as a {@link RecordedAction} list you can save and later feed to
 * {@link replayActions}.
 *
 * @template T - The store state type
 * @param store - The store to record dispatches on
 * @returns A recorder; call `.stop()` to end recording and get the list
 *
 * @example
 * ```typescript
 * const recorder = recordActions(store);
 * await store.dispatch('loadProducts', mockProducts);
 * await store.dispatch('addProduct', newProduct);
 * const actions = recorder.stop();
 * // actions: [{ type: 'loadProducts', payload: mockProducts }, { type: 'addProduct', payload: newProduct }]
 * ```
 */
export function recordActions<T>(store: Store<T>): ActionRecorder {
  const actions: RecordedAction[] = [];
  let active = true;

  store.addMiddleware((context) => {
    if (active) actions.push({ type: context.action, payload: context.payload });
  });

  return {
    stop(): RecordedAction[] {
      active = false;
      return actions;
    },
  };
}

/**
 * The state captured after each action in a replay, for asserting on
 * intermediate steps as well as the end result.
 * @template T - The store state type
 */
export interface ReplayResult<T> {
  /** State after each action, in the same order as the input list. */
  states: T[];
  /** State after the final action (equivalent to `states.at(-1)`). */
  finalState: T;
}

/**
 * Replays a recorded action sequence against `store`, dispatching each one
 * in order — for reproducing a bug report captured from DevTools action
 * history, or turning a hand-written action list into a deterministic test
 * instead of a hand-written dispatch/assert pair per step.
 *
 * @template T - The store state type
 * @param store - The store to dispatch against (typically freshly created)
 * @param actions - The actions to replay, in order
 * @returns The state after each step, and the final state
 *
 * @example
 * ```typescript
 * const store = createStore(initialState, actions);
 * const { finalState } = await replayActions(store, [
 *   { type: 'loadProducts', payload: mockProducts },
 *   { type: 'addProduct', payload: newProduct },
 *   { type: 'deleteProduct', payload: 'id-1' },
 * ]);
 *
 * expect(finalState.products).toHaveLength(mockProducts.length);
 * ```
 */
export async function replayActions<T>(
  store: Store<T>,
  actions: RecordedAction[]
): Promise<ReplayResult<T>> {
  const dispatch = store.dispatch.bind(store) as (
    action: string,
    payload?: unknown
  ) => Promise<void>;
  const states: T[] = [];

  for (const { type, payload } of actions) {
    await dispatch(type, payload);
    states.push(store.getState());
  }

  return { states, finalState: store.getState() };
}
