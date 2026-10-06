import { IllegalStateError } from '@temporalio/common';
import { errors as bridgeErrors } from '@temporalio/core-bridge';
declare const ShutdownError: typeof bridgeErrors.ShutdownError, TransportError: typeof bridgeErrors.TransportError, UnexpectedError: typeof bridgeErrors.UnexpectedError;
export { ShutdownError, TransportError, UnexpectedError };
/**
 * Thrown from JS if Worker does not shutdown in configured period
 */
export declare class GracefulShutdownPeriodExpiredError extends Error {
}
/**
 * Thrown from the Workflow Worker when a Promise is rejected, but there is no `catch` handler
 * for that Promise. This error wraps the original error that was thrown from the Promise.
 *
 * Occurrence of this error generally indicate a missing `await` statement on a call that return
 * a Promise. To silent rejections on a specific Promise, use `promise.catch(funcThatCantThrow)`
 * (e.g. `promise.catch(() => void 0)` or `promise.catch((e) => logger.error(e))`).
 */
export declare class UnhandledRejectionError extends Error {
    cause: unknown;
    constructor(message: string, cause: unknown);
}
/**
 * Combined error information for {@link Worker.runUntil}
 */
export interface CombinedWorkerRunErrorCause {
    /**
     * Error thrown by a Worker
     */
    workerError: unknown;
    /**
     * Error thrown by the wrapped promise or function
     */
    innerError: unknown;
}
/**
 * Error thrown by {@link Worker.runUntil} and {@link Worker.runReplayHistories}
 */
export declare class CombinedWorkerRunError extends Error {
    readonly cause: CombinedWorkerRunErrorCause;
    constructor(message: string, { cause }: {
        cause: CombinedWorkerRunErrorCause;
    });
}
/**
 * Error thrown by {@link Worker.runUntil} if the provided Promise does not resolve within the specified
 * {@link RunUntilOptions.promiseCompletionTimeout|timeout period} after the Worker has stopped.
 */
export declare class PromiseCompletionTimeoutError extends Error {
}
/**
 * @deprecated Import error classes directly
 */
export declare const errors: {
    IllegalStateError: typeof IllegalStateError;
    ShutdownError: typeof bridgeErrors.ShutdownError;
    TransportError: typeof bridgeErrors.TransportError;
    UnexpectedError: typeof bridgeErrors.UnexpectedError;
    GracefulShutdownPeriodExpiredError: typeof GracefulShutdownPeriodExpiredError;
};
