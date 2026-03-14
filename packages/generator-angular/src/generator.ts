/**
 * Angular code generator for Polystate store definitions
 * Generates NgRx store, actions, reducer, effects, selectors, and facade
 */

import { StoreDefinition, extractActions } from '@polystate/definition';

/**
 * Generates NgRx actions from a store definition
 */
export function generateNgRxActions(definition: StoreDefinition): string {
    const { name } = definition;
    const storeName = capitalize(name);

    return `/**
 * Generated NgRx actions for ${name} store
 * Do not edit manually - regenerate with: polystate generate
 */

import { createAction, props } from '@ngrx/store';

${generateActionCreators(definition)}
`;
}

/**
 * Generates NgRx reducer
 */
export function generateNgRxReducer(definition: StoreDefinition): string {
    const { name } = definition;
    const storeName = capitalize(name);

    return `/**
 * Generated NgRx reducer for ${name} store
 * Do not edit manually - regenerate with: polystate generate
 */

import { createReducer, on } from '@ngrx/store';
import * as ${storeName}Actions from './actions';
import { ${storeName}State } from './state';

export const initialState: ${storeName}State = ${JSON.stringify(
        definition.initialState,
        null,
        2
    )
            .split('\n')
            .join('\n')};

export const ${name}Reducer = createReducer(
  initialState,
${generateReducerHandlers(definition).split('\n').join('\n')}
);
`;
}

/**
 * Generates NgRx selectors
 */
export function generateNgRxSelectors(definition: StoreDefinition): string {
    const { name } = definition;
    const storeName = capitalize(name);

    return `/**
 * Generated NgRx selectors for ${name} store
 * Do not edit manually - regenerate with: polystate generate
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ${storeName}State } from './state';

export const select${storeName}State = createFeatureSelector<${storeName}State>(
  '${name}'
);

${generateSelectorFunctions(definition, name, storeName)}
`;
}

/**
 * Generates NgRx state interface
 */
export function generateNgRxState(definition: StoreDefinition): string {
    const { name } = definition;
    const storeName = capitalize(name);

    return `/**
 * Generated NgRx state for ${name} store
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
`;
}

/**
 * Generates Angular Facade Service for simplified component usage
 */
export function generateAngularFacade(definition: StoreDefinition): string {
    const { name } = definition;
    const storeName = capitalize(name);

    return `/**
 * Generated Angular Facade Service for ${name} store
 * Simplifies component interaction with NgRx store
 * Do not edit manually - regenerate with: polystate generate
 */

import { Injectable } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as ${storeName}Actions from './actions';
import * as from${storeName}Selectors from './selectors';
import { ${storeName}State } from './state';

@Injectable({ providedIn: 'root' })
export class ${storeName}Facade {
  // ========================================================================
  // Selectors (as Observables)
  // ========================================================================

${generateFacadeSelectors(definition, name, storeName).split('\n').join('\n')}

  constructor(private store: Store<{ ${name}: ${storeName}State }>) {}

  // ========================================================================
  // Actions (as methods)
  // ========================================================================

${generateFacadeActions(definition, name, storeName).split('\n').join('\n')}
}
`;
}

/**
 * Generates store module configuration
 */
export function generateStoreModule(definition: StoreDefinition): string {
    const { name } = definition;
    const storeName = capitalize(name);

    return `/**
 * Generated NgRx Store Module for ${name}
 * Do not edit manually - regenerate with: polystate generate
 */

import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { ${name}Reducer } from './reducer';

@NgModule({
  imports: [
    StoreModule.forFeature('${name}', ${name}Reducer),
  ],
})
export class ${storeName}StoreModule {}
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

function generateActionCreators(definition: StoreDefinition): string {
    return extractActions(definition)
        .map(({ name, paramCount }: { name: string; paramCount: number }) => {
            if (paramCount <= 1) {
                return `export const ${name} = createAction(
  '[${capitalize(definition.name)}] ${name}'
);`;
            } else {
                return `export const ${name} = createAction(
  '[${capitalize(definition.name)}] ${name}',
  props<{ payload: any }>()
);`;
            }
        })
        .join('\n\n');
}

function generateReducerHandlers(definition: StoreDefinition): string {
    const { name } = definition;
    const storeName = capitalize(name);

    return extractActions(definition)
        .map(({ name: actionName, handler, paramCount }: { name: string; handler: (...args: unknown[]) => unknown; paramCount: number }) => {
            const returnExpr = serializeHandlerForNgRx(
                handler as (...args: unknown[]) => unknown,
                paramCount
            );
            const paramList = paramCount > 1 ? '(state, { payload })' : '(state)';
            return `  on(${storeName}Actions.${actionName}, ${paramList} => ${returnExpr}),`;
        })
        .join('\n');
}

function serializeHandlerForNgRx(
    handler: (...args: unknown[]) => unknown,
    paramCount: number
): string {
    const src = handler.toString();
    const { stateParam, payloadParam } = extractNgRxParamNames(src);

    let normalized = renameParam(src, stateParam, 'state');
    if (payloadParam && paramCount > 1) {
        normalized = renameParam(normalized, payloadParam, 'payload');
    }

    const returnExpr = extractArrowReturnExpr(normalized);
    if (returnExpr === null) {
        const fallbackSrc = handler.toString();
        return paramCount > 1
            ? `({ ...state, ...(${fallbackSrc})(state, payload) })`
            : `({ ...state, ...(${fallbackSrc})(state) })`;
    }
    return returnExpr;
}

function extractNgRxParamNames(src: string): { stateParam: string; payloadParam: string | null } {
    const match = src.match(
        /^\s*(?:function\s*\w*\s*)?\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)(?:[^,)]*?)(?:,\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?/
    );
    return {
        stateParam: match?.[1] ?? 'state',
        payloadParam: match?.[2] ?? null,
    };
}

function renameParam(src: string, oldName: string, newName: string): string {
    if (oldName === newName) return src;
    // Expand shorthand object properties: { oldName, } → { oldName: newName, }
    // so the object key name is preserved when the param is renamed.
    const shorthandRe = new RegExp(`([{,]\\s*)\\b${oldName}\\b(?=\\s*[,}])`, 'g');
    let result = src.replace(shorthandRe, `$1${oldName}: ${newName}`);
    // Replace all remaining standalone occurrences (not preceded by `.` and not followed by `:`)
    result = result.replace(
        new RegExp(`(?<![.\\w])\\b${oldName}\\b(?![\\w:])`, 'g'),
        newName
    );
    return result;
}

function extractArrowReturnExpr(src: string): string | null {
    const arrowIdx = src.indexOf('=>');
    if (arrowIdx === -1) return null;

    let i = arrowIdx + 2;
    while (i < src.length && /\s/.test(src.charAt(i))) i++;

    if (src.charAt(i) === '(') {
        // Parenthesized expression: => ({ ... })
        return extractBalancedStr(src, i, '(', ')');
    }

    if (src.charAt(i) === '{') {
        // Block body: => { ... return { ... }; }
        const returnIdx = src.indexOf('return', i + 1);
        if (returnIdx === -1) return null;
        let j = returnIdx + 6;
        while (j < src.length && /\s/.test(src.charAt(j))) j++;
        if (src.charAt(j) === '(') {
            return extractBalancedStr(src, j, '(', ')');
        }
        if (src.charAt(j) === '{') {
            const inner = extractBalancedStr(src, j, '{', '}');
            return inner ? `(${inner})` : null;
        }
    }

    return null;
}

function extractBalancedStr(src: string, start: number, open: string, close: string): string | null {
    if (src.charAt(start) !== open) return null;
    let depth = 1;
    let i = start + 1;
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
            } else if (ch === open) {
                depth++;
            } else if (ch === close) {
                depth--;
            }
        }
        i++;
    }

    if (depth !== 0) return null;
    return src.slice(start, i);
}

function generateSelectorFunctions(
    definition: StoreDefinition,
    name: string,
    storeName: string
): string {
    return Object.keys(definition.initialState)
        .map((key) => {
            return `export const select${capitalize(key)} = createSelector(
  select${storeName}State,
  (state: ${storeName}State) => state.${key}
);`;
        })
        .join('\n\n');
}

function generateFacadeSelectors(
    definition: StoreDefinition,
    name: string,
    storeName: string
): string {
    return Object.keys(definition.initialState)
        .map((key) => {
            return `${key}$: Observable<any> = this.store.pipe(
    select(from${storeName}Selectors.select${capitalize(key)})
  );`;
        })
        .join('\n\n');
}

function generateFacadeActions(
    definition: StoreDefinition,
    name: string,
    storeName: string
): string {
    return extractActions(definition)
        .map(({ name: actionName, paramCount }) => {
            if (paramCount <= 1) {
                return `${actionName}(): void {
    this.store.dispatch(${storeName}Actions.${actionName}());
  }`;
            } else {
                return `${actionName}(payload: any): void {
    this.store.dispatch(${storeName}Actions.${actionName}({ payload }));
  }`;
            }
        })
        .join('\n\n');
}
