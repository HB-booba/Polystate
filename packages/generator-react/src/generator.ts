/**
 * React code generator for Polystate store definitions
 * Generates Redux store, actions, and hooks
 */

import { ActionAST, FieldAST, StoreAST, StoreDefinition, extractActions } from '@polystate/definition';

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
      .map(({ name }: { name: string }) => `  ${name},`)
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
import { useMemo } from 'react';
import type { RootState, AppDispatch } from './store';
import {
${extractActions(definition)
      .map(({ name }: { name: string }) => `  ${name},`)
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

function getTypeFromValue(value: any, depth = 0): string {
  if (value === null || value === undefined) return 'any';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'any[]'; // provide explicit element type via TypeScript generics at the definition
    return `Array<${getTypeFromValue(value[0], depth)}>`;
  }
  if (typeof value === 'object') {
    if (depth > 3) return 'Record<string, any>';
    const entries = Object.entries(value);
    if (entries.length === 0) return 'Record<string, any>';
    const props = entries
      .map(([k, v]) => `${k}: ${getTypeFromValue(v, depth + 1)}`)
      .join('; ');
    return `{ ${props} }`;
  }
  return typeof value;
}

function generateReducers(definition: StoreDefinition): string {
  return extractActions(definition)
    .map(({ name: actionName, handler, paramCount }: { name: string; handler: (...args: unknown[]) => unknown; paramCount: number }) =>
      serializeActionToReducer(
        actionName,
        handler as (...args: unknown[]) => unknown,
        paramCount
      )
    )
    .join('\n');
}

function serializeActionToReducer(
  actionName: string,
  handler: (...args: unknown[]) => unknown,
  paramCount: number
): string {
  const hasPayload = paramCount > 1;
  const src = handler.toString();
  const payloadParamName = hasPayload ? extractPayloadParamName(src) : null;
  const immerMutations = tryConvertHandlerToImmer(src, payloadParamName);

  if (immerMutations) {
    if (hasPayload) {
      return `    ${actionName}: (state, action: PayloadAction<any>) => {\n${immerMutations}\n    },`;
    }
    return `    ${actionName}: (state) => {\n${immerMutations}\n    },`;
  }

  // Fallback: inline the handler source and spread result onto state
  if (hasPayload) {
    return `    ${actionName}: (state, action: PayloadAction<any>) => {\n      return { ...state, ...(${src})(state, action.payload) };\n    },`;
  }
  return `    ${actionName}: (state) => {\n      return { ...state, ...(${src})(state) };\n    },`;
}

function extractPayloadParamName(src: string): string {
  // Works with both compiled JS (no type annotations) and raw TS source
  const match = src.match(
    /^\s*(?:function\s*\w*\s*)?\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/
  );
  return match?.[1] ?? 'payload';
}

function tryConvertHandlerToImmer(
  src: string,
  payloadParamName: string | null
): string | null {
  const objContent = extractReturnObjectContent(src);
  if (!objContent) return null;

  const trimmed = objContent.trimStart();
  if (!trimmed.startsWith('...state')) return null;

  // Remove the leading ...state spread
  const propsContent = trimmed.replace(/^\.\.\.\s*state\s*,\s*/, '').trim();
  if (!propsContent) return null;

  const props = extractObjectProperties(propsContent);
  if (!props || props.length === 0) return null;

  const lines: string[] = [];
  for (const { key, value } of props) {
    const mutation = convertPropertyToImmerMutation(key, value, payloadParamName);
    if (mutation === null) return null; // ambiguous → fall back
    lines.push(mutation);
  }
  return lines.join('\n');
}

function convertPropertyToImmerMutation(
  key: string,
  rawValue: string,
  payloadParamName: string | null
): string | null {
  let value = payloadParamName
    ? replacePayloadParam(rawValue, payloadParamName)
    : rawValue;
  value = value.trim();

  // Push pattern: [...state.key, item]
  const pushMatch = value.match(
    /^\[\s*\.\.\.\s*state\.[a-zA-Z_$][a-zA-Z0-9_$]*\s*,\s*([\s\S]+)\]\s*$/
  );
  if (pushMatch) {
    const item = pushMatch[1]!.trim().replace(/,\s*$/, '');
    return `      state.${key}.push(${item});`;
  }

  // Map pattern → ambiguous Immer conversion, fall back
  if (/^state\.[a-zA-Z_$][a-zA-Z0-9_$]*\.map\(/.test(value)) {
    return null;
  }

  // Filter/slice/reduce or any other array method: direct assignment
  if (/^state\.[a-zA-Z_$][a-zA-Z0-9_$]*\./.test(value)) {
    return `      state.${key} = ${value};`;
  }

  // Simple value assignment
  return `      state.${key} = ${value};`;
}

function replacePayloadParam(src: string, paramName: string): string {
  // Expand shorthand properties first: { paramName, } → { paramName: action.payload, }
  const shorthandRe = new RegExp(
    `((?:[{,][\\s\\r\\n]*))\\b(${paramName})\\b(?=[\\s\\r\\n]*[,}])`,
    'g'
  );
  let result = src.replace(
    shorthandRe,
    (_, before, name) => `${before}${name}: action.payload`
  );
  // Replace all remaining standalone occurrences (negative lookbehind for ".")
  result = result.replace(
    new RegExp(`(?<!\\.)\\b${paramName}\\b(?!\\s*:)`, 'g'),
    'action.payload'
  );
  return result;
}

function extractReturnObjectContent(src: string): string | null {
  const arrowIdx = src.indexOf('=>');
  if (arrowIdx === -1) return null;

  let i = arrowIdx + 2;
  while (i < src.length && /\s/.test(src.charAt(i))) i++;
  if (i >= src.length) return null;

  if (src.charAt(i) === '(') {
    // Arrow with parenthesized return: => ({ ... })
    i++;
    while (i < src.length && /\s/.test(src.charAt(i))) i++;
  } else if (src.charAt(i) === '{') {
    // Block body: => { ... return { ... }; }
    i++;
    const returnIdx = src.indexOf('return', i);
    if (returnIdx === -1) return null;
    i = returnIdx + 6;
    while (i < src.length && /\s/.test(src.charAt(i))) i++;
  }

  if (i >= src.length || src.charAt(i) !== '{') return null;

  // Extract balanced object content
  const start = i + 1;
  let depth = 1;
  i++;
  let inString = false;
  let stringChar = '';

  while (i < src.length && depth > 0) {
    const ch = src.charAt(i);
    if (inString) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === stringChar) inString = false;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') {
        inString = true;
        stringChar = ch;
      } else if (ch === '{' || ch === '(' || ch === '[') {
        depth++;
      } else if (ch === '}' || ch === ')' || ch === ']') {
        depth--;
      }
    }
    i++;
  }

  if (depth !== 0) return null;
  return src.slice(start, i - 1);
}

function extractObjectProperties(
  propsContent: string
): Array<{ key: string; value: string }> | null {
  const props: Array<{ key: string; value: string }> = [];
  let i = 0;
  const len = propsContent.length;

  while (i < len) {
    // Skip whitespace and commas
    while (i < len && (/\s/.test(propsContent.charAt(i)) || propsContent.charAt(i) === ',')) i++;
    if (i >= len) break;

    const keyMatch = propsContent.slice(i).match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (!keyMatch) break;

    const key = keyMatch[1]!;
    i += key.length;
    while (i < len && /\s/.test(propsContent.charAt(i))) i++;

    let value: string;

    if (i >= len || propsContent.charAt(i) === ',' || propsContent.charAt(i) === '}') {
      // Shorthand property
      value = key;
    } else if (propsContent.charAt(i) === ':') {
      i++; // skip ':'
      while (i < len && /\s/.test(propsContent.charAt(i))) i++;

      const valueStart = i;
      let depth = 0;
      let inString = false;
      let stringChar = '';

      while (i < len) {
        const ch = propsContent.charAt(i);
        if (inString) {
          if (ch === '\\') { i += 2; continue; }
          if (ch === stringChar) inString = false;
        } else {
          if (ch === '"' || ch === "'" || ch === '`') {
            inString = true;
            stringChar = ch;
          } else if (ch === '{' || ch === '(' || ch === '[') {
            depth++;
          } else if (ch === '}' || ch === ')' || ch === ']') {
            if (depth === 0) break;
            depth--;
          } else if (ch === ',' && depth === 0) {
            break;
          }
        }
        i++;
      }
      value = propsContent.slice(valueStart, i).trim();
    } else {
      break; // unexpected character
    }

    props.push({ key, value });
  }

  return props.length > 0 ? props : null;
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
  const baseHooks = Object.keys(definition.initialState)
    .map((key) => {
      const hookName = `use${capitalize(key)}`;
      return `export function ${hookName}() {
  return useSelector((state) => state.${name}.${key});
}`;
    })
    .join('\n\n');

  const hasTodos = Object.prototype.hasOwnProperty.call(definition.initialState, 'todos');
  const hasFilter = Object.prototype.hasOwnProperty.call(definition.initialState, 'filter');

  if (hasTodos && hasFilter) {
    const derivedHooks = `export function useFilteredTodos() {
  const todos = useTodos() as any[];
  const filter = useFilter() as string;

  if (filter === 'active') return todos.filter((todo: any) => !todo.done);
  if (filter === 'completed') return todos.filter((todo: any) => !!todo.done);
  return todos;
}

export function useActiveTodoCount() {
  const todos = useTodos() as any[];
  return todos.filter((todo: any) => !todo.done).length;
}`;

    return `${baseHooks}\n\n${derivedHooks}`;
  }

  return baseHooks;
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

// ============================================================================
// AST-based generators — produce typed output (no `any`) using StoreAST
// ============================================================================

/**
 * Converts a FieldAST to its TypeScript type string.
 * Uses the explicit type annotation from source if present; otherwise falls
 * back to runtime-value inference.
 */
function fieldToTypeStr(field: FieldAST): string {
  if (field.typeAnnotation) return field.typeAnnotation;
  return getTypeFromValue(field.initialValue);
}

/**
 * Serializes a field's initial value to a TypeScript-compatible literal.
 * Handles undefined (replaced by null) and uses JSON otherwise.
 */
function fieldToInitialValueStr(field: FieldAST): string {
  if (field.initialValue === undefined) return 'undefined';
  return JSON.stringify(field.initialValue, null, 2);
}

/**
 * Generates a single Redux Toolkit reducer case from an ActionAST.
 *
 * Strategy: extract the payload into a local const using the original
 * parameter name, then return the body verbatim. This preserves shorthand
 * property syntax (e.g. `{ ...state, filter }`) and complex expressions
 * (map/filter/ternary) without any regex rewriting.
 */
function actionToReducer(action: ActionAST): string {
  const { name, payloadType, payloadParamName, handlerBody } = action;

  if (payloadParamName && payloadType !== null) {
    return [
      `    ${name}: (state, action: PayloadAction<${payloadType}>) => {`,
      `      const ${payloadParamName} = action.payload;`,
      `      return ${handlerBody};`,
      `    },`,
    ].join('\n');
  }

  // No payload — keep the arrow function body as returned value
  return `    ${name}: (state) => ${handlerBody},`;
}

/**
 * Generates a dispatch hook entry from an ActionAST.
 */
function actionToDispatchHook(action: ActionAST): string {
  const { name, payloadType, payloadParamName } = action;
  if (payloadParamName && payloadType !== null) {
    return `      ${name}: (payload: ${payloadType}) => dispatch(${name}(payload)),`;
  }
  return `      ${name}: () => dispatch(${name}()),`;
}

/**
 * Generates a typed selector hook from an ActionAST (field-aware).
 */
function fieldToSelectorHook(field: FieldAST, storeName: string): string {
  const hookName = `use${capitalize(field.name)}`;
  return `export function ${hookName}() {
  return useSelector((state: RootState) => state.${storeName}.${field.name});
}`;
}

/**
 * Generates the Redux store file from a StoreAST (typed, no `any`).
 */
export function generateReduxStoreFromAST(ast: StoreAST): string {
  const { name, fields, actions } = ast;
  const storeName = capitalize(name);

  const stateFields = fields
    .map((f) => `  ${f.name}: ${fieldToTypeStr(f)};`)
    .join('\n');

  const initialStateLines = fields.map((f) => {
    const val = fieldToInitialValueStr(f);
    // inline single-line values, indent multi-line ones
    const indented = val.includes('\n')
      ? val.split('\n').map((l, i) => (i === 0 ? l : '  ' + l)).join('\n')
      : val;
    return `  ${f.name}: ${indented},`;
  });

  const reducers = actions.map((a) => actionToReducer(a)).join('\n');

  const actionExports = actions.map((a) => `  ${a.name},`).join('\n');

  const selectors = fields
    .map((f) => {
      const sel = `select${capitalize(f.name)}`;
      return `export const ${sel} = createSelector(\n  select${storeName}State,\n  (state) => state.${f.name}\n);`;
    })
    .join('\n\n');

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
${stateFields}
}

// ============================================================================
// Slice
// ============================================================================

const initialState: ${storeName}State = {
${initialStateLines.join('\n')}
};

const ${name}Slice = createSlice({
  name: '${name}',
  initialState,
  reducers: {
${reducers}
  },
});

// ============================================================================
// Actions
// ============================================================================

export const {
${actionExports}
} = ${name}Slice.actions;

// ============================================================================
// Selectors
// ============================================================================

const select${storeName}State = (state: RootState) => state.${name};

${selectors}

// ============================================================================
// Store Configuration
// ============================================================================

export const store = configureStore({
  reducer: {
    ${name}: ${name}Slice.reducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`;
}

/**
 * Generates the React hooks file from a StoreAST (typed, no `any`).
 */
export function generateHooksFromAST(ast: StoreAST): string {
  const { name, fields, actions } = ast;
  const storeName = capitalize(name);

  const actionImports = actions.map((a) => `  ${a.name},`).join('\n');
  const dispatchHooks = actions.map((a) => actionToDispatchHook(a)).join('\n');
  const selectorHooks = fields.map((f) => fieldToSelectorHook(f, name)).join('\n\n');

  // Derived hooks for todo+filter pattern
  const hasTodos = fields.some((f) => f.name === 'todos');
  const hasFilter = fields.some((f) => f.name === 'filter');
  const filterType = fields.find((f) => f.name === 'filter');
  const todosType = fields.find((f) => f.name === 'todos');
  const todoElementType = todosType?.typeAnnotation
    ? todosType.typeAnnotation.replace(/^Array<(.+)>$/, '$1').replace(/^\[(.+)\]$/, '$1')
    : 'any';

  const derivedHooks = hasTodos && hasFilter
    ? `\nexport function useFilteredTodos(): ${todosType?.typeAnnotation ?? 'any[]'} {
  const todos = useTodos();
  const filter = useFilter();
  if (filter === 'active') return todos.filter((t) => !t.done);
  if (filter === 'completed') return todos.filter((t) => !!t.done);
  return todos;
}

export function useActiveTodoCount(): number {
  return useTodos().filter((t) => !t.done).length;
}`
    : '';

  return `/**
 * Generated React hooks for ${name} store
 * Do not edit manually - regenerate with: polystate generate
 */

import { useDispatch, useSelector as useReduxSelector, TypedUseSelectorHook } from 'react-redux';
import { useMemo } from 'react';
import type { RootState, AppDispatch } from './store';
import {
${actionImports}
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
// Field Selector Hooks
// ============================================================================

${selectorHooks}
${derivedHooks}

// ============================================================================
// Action Dispatch Hooks
// ============================================================================

/**
 * Get all action dispatchers for ${name}
 */
export function use${storeName}Dispatch() {
  const dispatch = useAppDispatch();

  return useMemo(
    () => ({
${dispatchHooks}
    }),
    [dispatch]
  );
}
`;
}

/**
 * Generates the types file from a StoreAST.
 */
export function generateTypesFromAST(ast: StoreAST): string {
  const { name, fields, actions } = ast;
  const storeName = capitalize(name);

  const stateFields = fields.map((f) => `  ${f.name}: ${fieldToTypeStr(f)};`).join('\n');
  const actionTypes = actions
    .map((a) =>
      a.payloadType
        ? `  ${a.name}(payload: ${a.payloadType}): void;`
        : `  ${a.name}(): void;`
    )
    .join('\n');

  return `/**
 * Generated types for ${name} store
 * Do not edit manually - regenerate with: polystate generate
 */

export interface ${storeName}State {
${stateFields}
}

export interface ${storeName}Actions {
${actionTypes}
}
`;
}
