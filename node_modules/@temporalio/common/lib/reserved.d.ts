export declare const TEMPORAL_RESERVED_PREFIX = "__temporal_";
export declare const STACK_TRACE_QUERY_NAME = "__stack_trace";
export declare const ENHANCED_STACK_TRACE_QUERY_NAME = "__enhanced_stack_trace";
/**
 * Valid entity types that can be checked for reserved name violations
 */
export type ReservedNameEntityType = 'query' | 'signal' | 'update' | 'activity' | 'task queue' | 'sink' | 'workflow';
/**
 * Validates if the provided name contains any reserved prefixes or matches any reserved names.
 * Throws a TypeError if validation fails, with a specific message indicating whether the issue
 * is with a reserved prefix or an exact match to a reserved name.
 *
 * @param type The entity type being checked
 * @param name The name to check against reserved prefixes/names
 */
export declare function throwIfReservedName(type: ReservedNameEntityType, name: string): void;
