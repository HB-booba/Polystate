/**
 * @polystate/definition
 * Framework-agnostic store definitions for Polystate code generation
 */

export type {
    ActionHandler,
    ActionMap, GenerateOptions, GenerationResult, GeneratorConfig, StoreDefinition,
    ValidationResult
} from './types';

export { extractActions, normalizeStoreDefinition, validateStoreDefinition } from './validator';

