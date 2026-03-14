/**
 * Type definitions for Polystate store definitions
 * @module @polystate/definition
 */

/**
 * Represents an action handler function
 * @template TState - The shape of the store state
 * @template TPayload - The action payload type
 */
export type ActionHandler<TState, TPayload = any> = (
    state: TState,
    payload: TPayload
) => TState;

/**
 * Map of action handlers
 * @template TState - The shape of the store state
 */
export type ActionMap<TState> = {
    [actionName: string]: ActionHandler<TState, any>;
};

/**
 * Complete store definition that is framework-agnostic
 * @property name - Unique name for the store (used in generated code)
 * @property initialState - The initial state value
 * @property actions - Map of action handlers
 * @property description - Optional description for documentation
 * @template TState - The shape of the store state
 */
export interface StoreDefinition<TState = any> {
    name: string;
    initialState: TState;
    actions: ActionMap<TState>;
    description?: string;
}

/**
 * Validation result for store definitions
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Options for code generation
 */
export interface GenerateOptions {
    /**
     * Output directory for generated files
     */
    outDir: string;

    /**
     * Whether to generate React code
     */
    react?: boolean;

    /**
     * Whether to generate Angular code
     */
    angular?: boolean;

    /**
     * Whether to overwrite existing files
     */
    overwrite?: boolean;

    /**
     * Include TypeScript declaration files
     */
    includeTypes?: boolean;
}

/**
 * Configuration for a generator
 */
export interface GeneratorConfig {
    name: string;
    version: string;
    description: string;
}

/**
 * Result of code generation
 */
export interface GenerationResult {
    success: boolean;
    files: string[];
    errors: string[];
    warnings: string[];
}
