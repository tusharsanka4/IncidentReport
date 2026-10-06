"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceHandler = void 0;
exports.serviceHandler = serviceHandler;
const common_1 = require("../common");
const operation_handler_1 = require("./operation-handler");
/**
 * A Nexus Service implementation, that provides handlers for each of its operations.
 *
 * @experimental
 */
class ServiceHandler {
    definition;
    handlers;
    operationsMap;
    /**
     * Build a `ServiceHandler` from a service definition and a collection of operation handlers.
     *
     * There must be an operation handler for every operation in the service definition.
     *
     * @param service The service definition
     * @param handlers The collection of handlers
     * @returns The compiled service handler
     *
     * @internal
     * @hidden
     */
    static build(service, handlers) {
        const operations = new Map();
        for (const [propName, definition] of Object.entries(service.operations)) {
            const compiledOpHandler = (0, operation_handler_1.compileOperationHandler)(definition, handlers[propName]);
            const operationName = compiledOpHandler.name;
            if (operations.has(operationName)) {
                throw new TypeError(`Operation with name '${operationName}' already registered for service '${service.name}'`);
            }
            operations.set(operationName, compiledOpHandler);
        }
        return new ServiceHandler(service, handlers, operations);
    }
    constructor(definition, handlers, operationsMap) {
        this.definition = definition;
        this.handlers = handlers;
        this.operationsMap = operationsMap;
    }
    /**
     * Returns the definition and handler for a given operation.
     *
     * @param operationName
     */
    getOperationHandler(operationName) {
        const entry = this.operationsMap.get(operationName);
        if (entry == null) {
            throw new common_1.HandlerError("NOT_FOUND", `Operation handler not registered for operation '${operationName}' in service '${this.definition.name}'`);
        }
        return entry;
    }
}
exports.ServiceHandler = ServiceHandler;
/**
 * Constructs a service handler for a given service contract.
 *
 * @experimental
 */
function serviceHandler(service, handlers) {
    return ServiceHandler.build(service, handlers);
}
//# sourceMappingURL=service-handler.js.map