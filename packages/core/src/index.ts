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
  Unsubscriber
} from './store';

// Slices
export { composeSlices, createSlice, prefixActions } from './slice';
export type { Slice, SliceOptions } from './slice';

// Middleware
export { loadPersistedState, loggerMiddleware, persistMiddleware } from './middleware';
export type { Middleware, MiddlewareContext } from './middleware';

// RxJS compatibility
export { asObservable, distinctUntilChanged, filter, map, pipe, take } from './observable';
export type { Observable, Observer, Subscription } from './observable';

