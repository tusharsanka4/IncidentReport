/**
 * Helper to prevent `undefined` and `null` values overriding defaults when merging maps.
 */
export declare function filterNullAndUndefined<T extends Record<string, any>>(obj: T): T;
/**
 * Merge two objects, possibly removing keys.
 *
 * More specifically:
 * - Any key/value pair in `delta` overrides the corresponding key/value pair in `original`;
 * - A key present in `delta` with value `undefined` removes the key from the resulting object;
 * - If `original` is `undefined` or empty, return `delta`;
 * - If `delta` is `undefined` or empty, return `original` (or undefined if `original` is also undefined);
 * - If there are no changes, then return `original`.
 */
export declare function mergeObjects<T extends Record<string, any>>(original: T, delta: T | undefined): T;
/**
 * Recursively merges two objects, returning a new object.
 *
 * Properties from `source` will overwrite properties on `target`.
 * Nested objects are merged recursively.
 *
 * Object fields in the returned object are references, as in,
 * the returned object is not completely fresh.
 */
export declare function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T;
