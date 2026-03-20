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
 * Represents an async action handler (thunk) — takes an optional payload
 * and returns a Promise. Does NOT receive `state` as the first argument;
 * it is dispatched as a side-effect that can be awaited by the caller.
 *
 * @template TPayload - The action payload type (void = no payload)
 * @template TResult  - The type the promise resolves to
 */
export type AsyncActionHandler<TPayload = void, TResult = unknown> = (
    payload: TPayload
) => Promise<TResult>;

/**
 * Map of async action handlers
 */
export type AsyncActionMap = {
    [actionName: string]: AsyncActionHandler<any, any>;
};

/**
 * Complete store definition that is framework-agnostic
 * @property name - Unique name for the store (used in generated code)
 * @property initialState - The initial state value
 * @property actions - Map of synchronous action handlers
 * @property asyncActions - Optional map of async thunk handlers
 * @property description - Optional description for documentation
 * @template TState - The shape of the store state
 */
export interface StoreDefinition<TState = any> {
    name: string;
    initialState: TState;
    actions: ActionMap<TState>;
    asyncActions?: AsyncActionMap;
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

// ============================================================================
// AST Types — used by the CLI AST parser and AST-based generators
// ============================================================================

/**
 * A single field of the store's initial state with its type annotation.
 */
export interface FieldAST {
    /** Property name, e.g. "todos" */
    name: string;
    /**
     * TypeScript type annotation extracted from the source, e.g.
     * "Array<{ id: number; title: string; done: boolean }>"
     * or "'all' | 'active' | 'completed'".
     * Null when no inline annotation is present (falls back to runtime inference).
     */
    typeAnnotation: string | null;
    /** JSON-representable initial value for the field */
    initialValue: unknown;
}

/**
 * A single action handler extracted from the store definition source.
 */
export interface ActionAST {
    /** Action name, e.g. "addTodo" */
    name: string;
    /**
     * TypeScript type of the payload parameter as written in source, e.g. "number".
     * Null when the action takes no payload.
     */
    payloadType: string | null;
    /**
     * The identifier used for the payload parameter in the original source,
     * e.g. "id" or "title". Null when there is no payload.
     */
    payloadParamName: string | null;
    /** The identifier used for the state parameter, e.g. "state". */
    stateParamName: string;
    /**
     * The full text of the arrow-function body as it appears in the source
     * (after the `=>`), e.g. `({ ...state, todos: [...state.todos, { id: Date.now(), title, done: false }] })`.
     */
    handlerBody: string;
}

/**
 * A single async action handler (thunk) extracted from an asyncActions block.
 */
export interface AsyncActionAST {
    /** Action name, e.g. "fetchTodos" */
    name: string;
    /**
     * TypeScript type of the payload parameter, e.g. "string".
     * Null when there is no payload (async () => ...).
     */
    payloadType: string | null;
    /** The identifier used for the payload parameter, e.g. "title". Null when no payload. */
    payloadParamName: string | null;
    /**
     * The return type annotation of the async function, e.g. "Todo[]".
     * Null when no explicit return-type annotation exists.
     */
    returnType: string | null;
    /**
     * The full text of the async arrow-function body as it appears in the source.
     */
    handlerBody: string;
}

/**
 * Structured representation of a store definition file, produced by the
 * ts-morph AST parser. Used by AST-based generators to emit typed code
 * without relying on handler.toString() + regex.
 */
export interface StoreAST {
    /** Store name, e.g. "todo" */
    name: string;
    /** Optional description */
    description?: string;
    /** Ordered list of initial-state fields */
    fields: FieldAST[];
    /** Ordered list of synchronous action handlers */
    actions: ActionAST[];
    /** Ordered list of async thunk handlers (may be empty) */
    asyncActions: AsyncActionAST[];
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
