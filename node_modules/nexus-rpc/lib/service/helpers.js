"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.service = service;
exports.operation = operation;
const object_utils_1 = require("../internal/object-utils");
const service_definition_1 = require("./service-definition");
/**
 * Construct a service definition for a collection of operations.
 *
 * @experimental
 */
function service(name, operations) {
    const service = {
        name,
        operations: (0, object_utils_1.mapKeyValues)(operations, (key, op) => ({
            ...op,
            name: op.name || key,
        })),
    };
    (0, service_definition_1.validateServiceDefinition)(service);
    return service;
}
/**
 * Construct an operation definition as part of a service contract.
 *
 * @experimental
 */
function operation(op) {
    return { ...op };
}
//# sourceMappingURL=helpers.js.map