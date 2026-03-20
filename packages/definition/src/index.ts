/**
 * @polystate/definition
 * Framework-agnostic store definitions for Polystate code generation
 */

export type {
    ActionAST, ActionHandler, ActionMap, FieldAST, GenerateOptions, GenerationResult, GeneratorConfig, StoreAST, StoreDefinition,
    ValidationResult
} from './types';

export { extractActions, normalizeStoreDefinition, validateStoreDefinition } from './validator';

