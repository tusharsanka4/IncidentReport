"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapKeyValues = mapKeyValues;
/**
 * Creates a new object by mapping all string properties (keys and values) of an existing object
 * through a mapper function.
 *
 * @param obj - The source object, whose properties will be mapped.
 * @param fn - The mapper function.
 *
 * @returns A new object with the properties mapped to the new type.
 *
 * @internal
 * @hidden
 */
function mapKeyValues(obj, fn) {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(key, value)]));
}
//# sourceMappingURL=object-utils.js.map