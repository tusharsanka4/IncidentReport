"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationStillRunningError = void 0;
const symbol_instanceof_1 = require("../internal/symbol-instanceof");
/**
 * An operation result was requested, but the operation is still running.
 *
 * @experimental
 */
class OperationStillRunningError extends Error {
    /**
     * Construct a new {@link OperationStillRunningError}.
     *
     * @experimental
     */
    constructor() {
        super("Operation still running");
    }
}
exports.OperationStillRunningError = OperationStillRunningError;
(0, symbol_instanceof_1.injectSymbolBasedInstanceOf)(OperationStillRunningError, "OperationStillRunningError");
//# sourceMappingURL=operation-still-running-error.js.map