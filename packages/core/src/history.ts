import type { ActionMap } from './store';
import { Store } from './store';

/**
 * Options for {@link withHistory}.
 */
export interface HistoryOptions {
  /**
   * Maximum number of past states retained for undo. Once exceeded, the
   * oldest entry is dropped. Default: `100`.
   */
  limit?: number;
}

/**
 * Undo/redo controls added to a store by {@link withHistory}.
 */
export interface HistoryController {
  /** Steps back to the previous state. No-op if {@link canUndo} is `false`. */
  undo(): void;
  /** Steps forward to a state previously undone. No-op if {@link canRedo} is `false`. */
  redo(): void;
  /** Whether {@link undo} has a state to step back to. */
  canUndo(): boolean;
  /** Whether {@link redo} has a state to step forward to. */
  canRedo(): boolean;
  /** Discards all recorded history without changing the current state. */
  clearHistory(): void;
}

/**
 * Adds a bounded undo/redo history to a store — in-app undo/redo UX (e.g.
 * an editor's Ctrl+Z), independent of DevTools time-travel. Every dispatch
 * that changes state pushes the previous state onto the undo stack (capped
 * at `limit`) and clears the redo stack, matching standard editor
 * undo/redo semantics: undo, then dispatch a new action, and redo is gone.
 *
 * `undo`/`redo` apply state via `store.setState()`, which bypasses the
 * middleware pipeline — so stepping through history never itself gets
 * recorded as a new history entry.
 *
 * @template T - The store state type
 * @template A - The store's action map type
 * @param store - The store to add undo/redo to
 * @param options - Configuration (history size limit)
 * @returns The same store instance, with `undo`/`redo`/`canUndo`/`canRedo`/`clearHistory` added
 *
 * @example
 * ```typescript
 * const store = withHistory(
 *   createStore({ text: '' }, {
 *     setText: (state, text: string) => ({ ...state, text }),
 *   }),
 *   { limit: 50 }
 * );
 *
 * store.dispatch('setText', 'a');
 * store.dispatch('setText', 'ab');
 * store.undo(); // { text: 'a' }
 * store.undo(); // { text: '' }
 * store.redo(); // { text: 'a' }
 * ```
 */
export function withHistory<T, A extends ActionMap<T> = ActionMap<T>>(
  store: Store<T, A>,
  options: HistoryOptions = {}
): Store<T, A> & HistoryController {
  const limit = options.limit ?? 100;
  const past: T[] = [];
  const future: T[] = [];

  store.addMiddleware((context) => {
    past.push(context.prevState);
    if (past.length > limit) past.shift();
    future.length = 0;
  });

  return Object.assign(store, {
    undo(): void {
      if (past.length === 0) return;
      future.push(store.getState());
      store.setState(past.pop()!);
    },
    redo(): void {
      if (future.length === 0) return;
      past.push(store.getState());
      store.setState(future.pop()!);
    },
    canUndo(): boolean {
      return past.length > 0;
    },
    canRedo(): boolean {
      return future.length > 0;
    },
    clearHistory(): void {
      past.length = 0;
      future.length = 0;
    },
  });
}
