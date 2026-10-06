"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errors = exports.PromiseCompletionTimeoutError = exports.CombinedWorkerRunError = exports.UnhandledRejectionError = exports.GracefulShutdownPeriodExpiredError = exports.UnexpectedError = exports.TransportError = exports.ShutdownError = void 0;
const common_1 = require("@temporalio/common");
const type_helpers_1 = require("@temporalio/common/lib/type-helpers");
const core_bridge_1 = require("@temporalio/core-bridge");
const { ShutdownError, TransportError, UnexpectedError } = core_bridge_1.errors;
exports.ShutdownError = ShutdownError;
exports.TransportError = TransportError;
exports.UnexpectedError = UnexpectedError;
/**
 * Thrown from JS if Worker does not shutdown in configured period
 */
let GracefulShutdownPeriodExpiredError = class GracefulShutdownPeriodExpiredError extends Error {
};
exports.GracefulShutdownPeriodExpiredError = GracefulShutdownPeriodExpiredError;
exports.GracefulShutdownPeriodExpiredError = GracefulShutdownPeriodExpiredError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('GracefulShutdownPeriodExpiredError')
], GracefulShutdownPeriodExpiredError);
/**
 * Thrown from the Workflow Worker when a Promise is rejected, but there is no `catch` handler
 * for that Promise. This error wraps the original error that was thrown from the Promise.
 *
 * Occurrence of this error generally indicate a missing `await` statement on a call that return
 * a Promise. To silent rejections on a specific Promise, use `promise.catch(funcThatCantThrow)`
 * (e.g. `promise.catch(() => void 0)` or `promise.catch((e) => logger.error(e))`).
 */
let UnhandledRejectionError = class UnhandledRejectionError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
    }
};
exports.UnhandledRejectionError = UnhandledRejectionError;
exports.UnhandledRejectionError = UnhandledRejectionError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('UnhandledRejectionError')
], UnhandledRejectionError);
/**
 * Error thrown by {@link Worker.runUntil} and {@link Worker.runReplayHistories}
 */
let CombinedWorkerRunError = class CombinedWorkerRunError extends Error {
    cause;
    constructor(message, { cause }) {
        super(message);
        this.cause = cause;
    }
};
exports.CombinedWorkerRunError = CombinedWorkerRunError;
exports.CombinedWorkerRunError = CombinedWorkerRunError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('CombinedWorkerRunError')
], CombinedWorkerRunError);
/**
 * Error thrown by {@link Worker.runUntil} if the provided Promise does not resolve within the specified
 * {@link RunUntilOptions.promiseCompletionTimeout|timeout period} after the Worker has stopped.
 */
let PromiseCompletionTimeoutError = class PromiseCompletionTimeoutError extends Error {
};
exports.PromiseCompletionTimeoutError = PromiseCompletionTimeoutError;
exports.PromiseCompletionTimeoutError = PromiseCompletionTimeoutError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('PromiseCompletionTimeoutError')
], PromiseCompletionTimeoutError);
/**
 * @deprecated Import error classes directly
 */
exports.errors = {
    IllegalStateError: common_1.IllegalStateError,
    ShutdownError,
    TransportError,
    UnexpectedError,
    GracefulShutdownPeriodExpiredError,
};
//# sourceMappingURL=errors.js.map