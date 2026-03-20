/**
 * @polystate/react
 * React 18+ hooks and context for Polystate state management
 *
 * @packageDocumentation
 */

export { createStoreContext } from './context';
export { createStoreHooks, useDispatch, useSelector, useSetState, useStore } from './hooks';

export type { ActionMap, Selector, Store, ThunkAction } from '@polystate/core';
