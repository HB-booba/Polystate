/**
 * @polystate/core
 * Framework-agnostic state management core - zero dependencies
 *
 * @packageDocumentation
 */

// Signal primitive
export { Signal } from './signal';

// Store and types
export { createStore, Store } from './store';
export type {
  ActionHandler,
  ActionMap,
  Selector,
  StoreOptions,
  Subscriber,
  ThunkAction,
  Unsubscriber,
} from './store';

// Slices
export { composeSlices, createSlice, prefixActions } from './slice';
export type { Slice, SliceOptions } from './slice';

// Selectors
export { createSelector } from './selector';

// History (undo/redo)
export { withHistory } from './history';
export type { HistoryController, HistoryOptions } from './history';

// Multi-store sync
export { syncStores } from './sync';
export type { SyncMerge } from './sync';

// Action recording / replay (testing utilities)
export { recordActions, replayActions } from './replay';
export type { ActionRecorder, RecordedAction, ReplayResult } from './replay';

// Middleware
export { loadPersistedState, loggerMiddleware, persistMiddleware } from './middleware';
export type { Middleware, MiddlewareContext } from './middleware';

// Effects
export { effects } from './effects';
export type { EffectHandler, EffectMap, EffectOptions } from './effects';

// RxJS compatibility
export { asObservable, distinctUntilChanged, filter, map, pipe, take } from './observable';
export type { Observable, Observer, Subscription } from './observable';
