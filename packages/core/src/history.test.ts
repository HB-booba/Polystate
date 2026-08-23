import { describe, expect, it } from 'vitest';
import { withHistory } from './history';
import { createStore } from './store';

interface EditorState {
  text: string;
}

function makeStore(limit?: number) {
  return withHistory(
    createStore<EditorState>(
      { text: '' },
      {
        setText: (state, text: string) => ({ ...state, text }),
      }
    ),
    limit !== undefined ? { limit } : undefined
  );
}

describe('withHistory', () => {
  it('starts with nothing to undo or redo', () => {
    const store = makeStore();
    expect(store.canUndo()).toBe(false);
    expect(store.canRedo()).toBe(false);
  });

  it('undo() steps back to the previous state', async () => {
    const store = makeStore();
    await store.dispatch('setText', 'a');
    await store.dispatch('setText', 'ab');

    store.undo();
    expect(store.getState().text).toBe('a');
    store.undo();
    expect(store.getState().text).toBe('');
    expect(store.canUndo()).toBe(false);
  });

  it('redo() steps forward through undone states', async () => {
    const store = makeStore();
    await store.dispatch('setText', 'a');
    await store.dispatch('setText', 'ab');

    store.undo();
    store.undo();
    store.redo();
    expect(store.getState().text).toBe('a');
    store.redo();
    expect(store.getState().text).toBe('ab');
    expect(store.canRedo()).toBe(false);
  });

  it('undo() and redo() are no-ops at the ends of history', async () => {
    const store = makeStore();
    // Nothing to undo yet.
    store.undo();
    expect(store.getState().text).toBe('');

    await store.dispatch('setText', 'a');
    store.undo();
    // Nothing to redo yet — until an undo happened. Now redo forward, then
    // try redoing again past the end.
    store.redo();
    store.redo();
    expect(store.getState().text).toBe('a');
  });

  it('a new dispatch after undo() clears the redo stack', async () => {
    const store = makeStore();
    await store.dispatch('setText', 'a');
    await store.dispatch('setText', 'ab');

    store.undo();
    expect(store.canRedo()).toBe(true);

    await store.dispatch('setText', 'xyz');
    expect(store.canRedo()).toBe(false);
    store.redo(); // no-op
    expect(store.getState().text).toBe('xyz');
  });

  it('undoing/redoing does not itself get recorded as history', async () => {
    const store = makeStore();
    await store.dispatch('setText', 'a');
    await store.dispatch('setText', 'ab');
    await store.dispatch('setText', 'abc');

    store.undo(); // -> 'ab'
    store.undo(); // -> 'a'
    // If undo/redo were recorded, this third undo would land somewhere
    // other than the true initial state.
    store.undo(); // -> ''
    expect(store.getState().text).toBe('');
    expect(store.canUndo()).toBe(false);
  });

  it('caps the undo stack at the configured limit', async () => {
    const store = makeStore(2);
    await store.dispatch('setText', 'a');
    await store.dispatch('setText', 'ab');
    await store.dispatch('setText', 'abc');
    await store.dispatch('setText', 'abcd');

    // Only the 2 most recent past states are retained.
    store.undo();
    expect(store.getState().text).toBe('abc');
    store.undo();
    expect(store.getState().text).toBe('ab');
    expect(store.canUndo()).toBe(false);
  });

  it('clearHistory() discards past and future without changing state', async () => {
    const store = makeStore();
    await store.dispatch('setText', 'a');
    await store.dispatch('setText', 'ab');
    store.undo();

    store.clearHistory();
    expect(store.canUndo()).toBe(false);
    expect(store.canRedo()).toBe(false);
    expect(store.getState().text).toBe('a');
  });
});
