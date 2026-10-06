import type { Failure } from "./failure";
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
export declare class OperationError extends Error {
    /**
     * State of the operation.
     */
    readonly state: OperationErrorState;
    /**
     * The error that resulted in this operation error.
     */
    readonly cause: Error;
    /**
     * Set if this error was constructed from a {@link Failure} object.
     *
     * Preserves the original failure for round-tripping through the wire format.
     */
    readonly originalFailure?: Failure;
    /**
     * Constructs a new {@link OperationError}.
     *
     * @param state - The state of the operation.
     * @param message - The message of the error.
     * @param options - Extra options for the error, e.g. the cause.
     *
     * @experimental
     */
    constructor(state: OperationErrorState, message?: string | undefined, options?: OperationErrorOptions);
}
/**
 * Options for constructing an {@link OperationError}.
 *
 * @experimental
 * @inline
 */
export interface OperationErrorOptions {
    /**
     * Underlying cause of the error.
     */
    cause?: Error | undefined;
    /**
     * An optional stack trace string associated with this error.
     *
     * When provided, this overrides the native `stack` property on the error.
     * This is typically used for remote stack traces received over the wire,
     * which may originate from a different language runtime.
     */
    stackTrace?: string;
    /**
     * An optional {@link Failure} object from which this error was constructed.
     *
     * Preserves the original failure for round-tripping through the wire format.
     */
    originalFailure?: Failure;
}
/**
 * Describes state of an operation that did not complete successfully.
 *
 * @experimental
 * @inline
 */
export type OperationErrorState = "failed" | "canceled";
