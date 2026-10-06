"use strict";
/** @import { OperationHandler } from "./operation-handler" */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlerStartOperationResult = void 0;
/**
 * An internal symbol, used to prevent direct implementation of interfaces.
 *
 * @hidden
 * @internal
 */
const isHandlerStartOperationResultSymbol = Symbol("__nexus_isHandlerStartOperationResult");
/**
 * The return type from the {@link OperationHandler.start} method.
 *
 * Use either {@link HandlerStartOperationResult.sync} or {@link HandlerStartOperationResult.async}
 * to create a result object. Do not implement this interface directly.
 *
 * @experimental
 */
exports.HandlerStartOperationResult = {
    /**
     * Create a result that indicates that an operation has been accepted and will complete asynchronously.
     */
    async(token) {
        return {
            isAsync: true,
            token,
            [isHandlerStartOperationResultSymbol]: true,
        };
    },
    /**
     * Create a result that indicates that an operation completed successfully.
     */
    sync(value) {
        return {
            isAsync: false,
            value,
            [isHandlerStartOperationResultSymbol]: true,
        };
    },
    [Symbol.hasInstance]: function (value) {
        return (typeof value === "object" &&
            value !== null &&
            value[isHandlerStartOperationResultSymbol] === true);
    },
};
//# sourceMappingURL=start-operation-result.js.map