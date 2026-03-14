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

function generateActionCreators(definition: StoreDefinition): string {
    return extractActions(definition)
        .map(({ name, paramCount }) => {
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
        .map(({ name: actionName }) => {
            return `  on(${storeName}Actions.${actionName}, (state) => {
    // TODO: Implement reducer logic
    return state;
  }),`;
        })
        .join('\n');
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
