/**
 * React code generator for Polystate store definitions
 * Generates Redux store, actions, and hooks
 */

import { StoreDefinition, extractActions } from '@polystate/definition';

interface GeneratorOptions {
    overwrite?: boolean;
}

/**
 * Generates Redux store code from a store definition
 */
export function generateReduxStore(definition: StoreDefinition): string {
    const { name, initialState } = definition;
    const storeName = capitalize(name);

    return `/**
 * Generated Redux store for ${name}
 * Do not edit manually - regenerate with: polystate generate
 */

import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

// ============================================================================
// State Type
// ============================================================================

export interface ${storeName}State {
${Object.entries(initialState)
            .map(
                ([key, value]) =>
                    `  ${key}: ${getTypeFromValue(value)};`
            )
            .join('\n')}
}

// ============================================================================
// Slice
// ============================================================================

const initialState: ${storeName}State = ${JSON.stringify(initialState, null, 2).split('\n').join('\n')};

const ${name}Slice = createSlice({
  name: '${name}',
  initialState,
  reducers: {
${generateReducers(definition).split('\n').join('\n')}
  },
});

// ============================================================================
// Actions
// ============================================================================

export const {
${extractActions(definition)
            .map(({ name }) => `  ${name},`)
            .join('\n')}
} = ${name}Slice.actions;

// ============================================================================
// Selectors
// ============================================================================

const select${storeName}State = (state: RootState) => state.${name};

${generateSelectors(definition, name, storeName)}

// ============================================================================
// Store Configuration
// ============================================================================

export const store = configureStore({
  reducer: {
    ${name}: ${name}Slice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(loggerMiddleware)
      .concat(persistMiddleware),
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ============================================================================
// Middleware
// ============================================================================

function loggerMiddleware(store: any) {
  return (next: any) => (action: any) => {
    console.log('[${name}] Action:', action.type, action.payload);
    const result = next(action);
    console.log('[${name}] New State:', store.getState());
    return result;
  };
}

function persistMiddleware(store: any) {
  return (next: any) => (action: any) => {
    const result = next(action);
    localStorage.setItem(
      'polystate_${name}',
      JSON.stringify(store.getState().${name})
    );
    return result;
  };
}

// Load persisted state on startup
const persistedState = localStorage.getItem('polystate_${name}');
if (persistedState) {
  try {
    const parsed = JSON.parse(persistedState);
    store.dispatch({ type: 'SET_STATE', payload: parsed } as any);
  } catch (e) {
    console.error('Failed to load persisted state:', e);
  }
}
`;
}

/**
 * Generates hooks for component usage
 */
export function generateHooks(definition: StoreDefinition): string {
    const { name } = definition;
    const storeName = capitalize(name);

    return `/**
 * Generated React hooks for ${name} store
 * Do not edit manually - regenerate with: polystate generate
 */

import { useDispatch, useSelector as useReduxSelector, TypedUseSelectorHook } from 'react-redux';
import { useMemo, useCallback } from 'react';
import type { RootState, AppDispatch } from './store';
import {
${extractActions(definition)
            .map(({ name }) => `  ${name},`)
            .join('\n')}
} from './store';

// ============================================================================
// Typed Hooks
// ============================================================================

export const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;
export const useAppDispatch = () => useDispatch<AppDispatch>();

// ============================================================================
// Store Hooks
// ============================================================================

/**
 * Get the entire ${name} state
 */
export function use${storeName}State() {
  return useSelector((state) => state.${name});
}

// ============================================================================
// Action Hooks
// ============================================================================

/**
 * Get all action dispatchers for ${name}
 */
export function use${storeName}Dispatch() {
  const dispatch = useAppDispatch();

  return useMemo(
    () => ({
${generateDispatchHooks(definition).split('\n').join('\n')}
    }),
    [dispatch]
  );
}

// ============================================================================
// Selector Hooks
// ============================================================================

${generateSelectorHooks(definition)}
`;
}

/**
 * Generates types file
 */
export function generateTypes(definition: StoreDefinition): string {
    const { name } = definition;
    const storeName = capitalize(name);

    return `/**
 * Generated types for ${name} store
 * Do not edit manually - regenerate with: polystate generate
 */

export interface ${storeName}State {
${Object.entries(definition.initialState)
            .map(
                ([key, value]) =>
                    `  ${key}: ${getTypeFromValue(value)};`
            )
            .join('\n')}
}

export interface ${storeName}Actions {
${generateActionTypes(definition).split('\n').join('\n')}
}
`;
}

// ============================================================================
// Helper Functions
// ============================================================================

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTypeFromValue(value: any): string {
    if (value === null || value === undefined) return 'any';
    if (Array.isArray(value)) {
        if (value.length === 0) return 'any[]';
        return `Array<${getTypeFromValue(value[0])}>`;
    }
    if (typeof value === 'object') {
        return 'Record<string, any>';
    }
    return typeof value;
}

function generateReducers(definition: StoreDefinition): string {
    return extractActions(definition)
        .map(({ name, paramCount }) => {
            const payload = paramCount > 1 ? 'action.payload' : '""';
            return `    ${name}: (state, action: PayloadAction<any>) => {
      return state;
    },`;
        })
        .join('\n');
}

function generateSelectors(
    definition: StoreDefinition,
    name: string,
    storeName: string
): string {
    return Object.keys(definition.initialState)
        .map((key) => {
            const selectorName = `select${capitalize(key)}`;
            return `export const ${selectorName} = createSelector(
  select${storeName}State,
  (state) => state.${key}
);`;
        })
        .join('\n\n');
}

function generateDispatchHooks(definition: StoreDefinition): string {
    return extractActions(definition)
        .map(({ name, paramCount }) => {
            if (paramCount <= 1) {
                return `      ${name}: () => dispatch(${name}()),`;
            } else {
                return `      ${name}: (payload: any) => dispatch(${name}(payload)),`;
            }
        })
        .join('\n');
}

function generateSelectorHooks(definition: StoreDefinition): string {
    const { name } = definition;
    const storeName = capitalize(name);

    return Object.keys(definition.initialState)
        .map((key) => {
            const selectorName = `select${capitalize(key)}`;
            const hookName = `use${capitalize(key)}`;
            return `export function ${hookName}() {
  return useSelector((state) => state.${name}.${key});
}`;
        })
        .join('\n\n');
}

function generateActionTypes(definition: StoreDefinition): string {
    return extractActions(definition)
        .map(({ name, paramCount }) => {
            if (paramCount <= 1) {
                return `  ${name}(): void;`;
            } else {
                return `  ${name}(payload: any): void;`;
            }
        })
        .join('\n');
}
