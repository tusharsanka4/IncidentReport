"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterNullAndUndefined = filterNullAndUndefined;
exports.mergeObjects = mergeObjects;
exports.deepMerge = deepMerge;
/**
 * Helper to prevent `undefined` and `null` values overriding defaults when merging maps.
 */
function filterNullAndUndefined(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([_k, v]) => v != null));
}
function mergeObjects(original, delta) {
    if (original == null)
        return delta;
    if (delta == null)
        return original;
    const merged = { ...original };
    let changed = false;
    for (const [k, v] of Object.entries(delta)) {
        if (v !== merged[k]) {
            if (v == null)
                delete merged[k];
            else
                merged[k] = v;
            changed = true;
        }
    }
    return changed ? merged : original;
}
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}
/**
 * Recursively merges two objects, returning a new object.
 *
 * Properties from `source` will overwrite properties on `target`.
 * Nested objects are merged recursively.
 *
 * Object fields in the returned object are references, as in,
 * the returned object is not completely fresh.
 */
function deepMerge(target, source) {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        for (const key of Object.keys(source)) {
            const sourceValue = source[key];
            if (isObject(sourceValue) && key in target && isObject(target[key])) {
                output[key] = deepMerge(target[key], sourceValue);
            }
            else {
                output[key] = sourceValue;
            }
        }
    }
    return output;
}
//# sourceMappingURL=objects-helpers.js.map