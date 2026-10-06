"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationError = void 0;
const symbol_instanceof_1 = require("../internal/symbol-instanceof");
/**
 * A Nexus operation error.
 *
 * This error class represents the abnormal completion of a Nexus operation,
 * that should be reported to the caller as an operation error.
 *
 * Example:
 *
 * ```ts
 *     import { OperationError } from "nexus-rpc";
 *
 *     // Throw a failed operation error
 *     throw new OperationError("failed", "Not enough inventory");
 *
 *     // Throw a failed operation error, with a cause
 *     throw new OperationError("failed", "Not enough inventory", { cause });
 *
 *     // Throw a canceled operation error
 *     throw new OperationError("canceled", "User canceled the operation");
 * ```
 *
 * @experimental
 */
class OperationError extends Error {
    /**
     * State of the operation.
     */
    state;
    /**
     * Set if this error was constructed from a {@link Failure} object.
     *
     * Preserves the original failure for round-tripping through the wire format.
     */
    originalFailure;
    /**
     * Constructs a new {@link OperationError}.
     *
     * @param state - The state of the operation.
     * @param message - The message of the error.
     * @param options - Extra options for the error, e.g. the cause.
     *
     * @experimental
     */
    constructor(state, message, options) {
        const defaultMessage = state === "canceled" ? `Operation canceled` : `Operation failed`;
        const actualMessage = message || defaultMessage;
        super(actualMessage, { cause: options?.cause });
        this.state = state;
        this.originalFailure = options?.originalFailure;
        if (options?.stackTrace !== undefined) {
            this.stack = options.stackTrace;
        }
    }
}
exports.OperationError = OperationError;
(0, symbol_instanceof_1.injectSymbolBasedInstanceOf)(OperationError, "OperationError");
//# sourceMappingURL=operation-error.js.map