"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileOperationHandler = compileOperationHandler;
const common_1 = require("../common");
const start_operation_result_1 = require("./start-operation-result");
/**
 * Compiles an operation handler into a {@link CompiledOperationHandler}. A compiled operation
 * handler is a single object that is both an operation definition and a full-fledged operation
 * handler for that operation.
 *
 * @hidden
 * @internal
 */
function compileOperationHandler(definition, handler) {
    if (handler == null) {
        throw new TypeError(`No handler registered for operation '${definition.name}' (expected property name '${definition.name}')`);
    }
    if (typeof handler === "function") {
        // Operation handler is declared using the shortcut syntax. Wrap it into a full-fledged handler.
        return {
            ...definition,
            start: async (ctx, input) => {
                return start_operation_result_1.HandlerStartOperationResult.sync(await handler(ctx, input));
            },
            cancel: notImplemented,
        };
    }
    if (typeof handler.start !== "function") {
        throw new TypeError(`Handler for operation '${definition.name}' has no start method`);
    }
    return {
        ...definition,
        // Defensively ensure that the handler has all the required methods,
        // defaulting to throwing a not implemented error if some methods are missing.
        start: handler.start.bind(handler),
        cancel: handler.cancel?.bind(handler) ?? notImplemented,
    };
}
/**
 * @internal
 * @hidden
 */
function notImplemented() {
    throw new common_1.HandlerError("NOT_IMPLEMENTED", "Not implemented");
}
//# sourceMappingURL=operation-handler.js.map