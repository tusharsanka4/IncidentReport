"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateServiceDefinition = validateServiceDefinition;
/**
 * Confirm that a service definition is valid.
 *
 * @param service - The service definition to validate.
 *
 * @throws {TypeError} If the service definition is invalid.
 *
 * @experimental
 */
function validateServiceDefinition(service) {
    if (typeof service.name !== "string" || !service.name) {
        throw new TypeError("Service name must be a non-empty string");
    }
    const operationNames = new Set();
    for (const [propName, operation] of Object.entries(service.operations)) {
        const operationName = operation.name;
        if (typeof operationName !== "string" || !operationName) {
            throw new TypeError(`Operation name must be a non-empty string, for property '${propName}'`);
        }
        if (operationNames.has(operationName)) {
            throw new TypeError(`Duplicate operation definition for name: '${operationName}'`);
        }
        operationNames.add(operationName);
    }
}
//# sourceMappingURL=service-definition.js.map