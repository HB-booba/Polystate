import { StoreDefinition, ValidationResult } from './types';

/**
 * Validates a store definition
 * @param definition - The store definition to validate
 * @returns Validation result with any errors or warnings
 */
export function validateStoreDefinition(
    definition: any
): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required properties
    if (!definition) {
        errors.push('Definition cannot be null or undefined');
        return { valid: false, errors, warnings };
    }

    if (!definition.name) {
        errors.push('Definition must have a "name" property');
    } else if (typeof definition.name !== 'string') {
        errors.push('Definition "name" must be a string');
    } else if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(definition.name)) {
        errors.push(
            'Definition "name" must be a valid JavaScript identifier'
        );
    }

    if (definition.initialState === undefined) {
        errors.push('Definition must have an "initialState" property');
    }

    if (!definition.actions || typeof definition.actions !== 'object') {
        errors.push('Definition must have an "actions" property (object)');
    } else {
        const actions = definition.actions;
        const actionNames = Object.keys(actions);

        if (actionNames.length === 0) {
            warnings.push('Definition has no actions defined');
        }

        // Validate each action
        for (const actionName of actionNames) {
            if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(actionName)) {
                errors.push(
                    `Action name "${actionName}" must be a valid JavaScript identifier`
                );
            }

            const action = actions[actionName];
            if (typeof action !== 'function') {
                errors.push(
                    `Action "${actionName}" must be a function, got ${typeof action}`
                );
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Normalizes a store definition for code generation
 * Ensures all required properties have proper values
 * @param definition - The store definition to normalize
 * @returns Normalized definition
 */
export function normalizeStoreDefinition<T = any>(
    definition: any
): StoreDefinition<T> {
    return {
        name: definition.name,
        initialState: definition.initialState,
        actions: definition.actions || {},
        description: definition.description,
    };
}

/**
 * Extracts action information from a store definition
 * @param definition - The store definition
 * @returns Array of {name, handler} for each action
 */
export function extractActions(definition: StoreDefinition) {
    return Object.entries(definition.actions).map(([name, handler]) => ({
        name,
        handler,
        paramCount: (handler as Function).length,
    }));
}
