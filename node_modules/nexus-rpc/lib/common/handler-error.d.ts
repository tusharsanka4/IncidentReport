import type { Failure } from "./failure";
/**
 * A Nexus handler error.
 *
 * This error class represents an error that occurred during the handling of a
 * Nexus operation that should be reported to the caller as a handler error.
 *
 * Example:
 *
 * ```ts
 *     import { HandlerError } from "nexus-rpc";
 *
 *     // Throw a bad request error
 *     throw new HandlerError("BAD_REQUEST", "Invalid input provided");
 *
 *     // Throw a bad request error, with a cause
 *     throw new HandlerError("BAD_REQUEST", "Invalid input provided", { cause });
 *
 *     // Throw a retryable internal error
 *     throw new HandlerError("INTERNAL", "Database unavailable", { retryableOverride: true });
 *
 * ```
 *
 * @experimental
 */
export declare class HandlerError extends Error {
    /**
     * One of the predefined error types.
     *
     * If the constructor received an unknown string, this will be `"UNKNOWN"`.
     * Use {@link rawErrorType} to access the original string.
     *
     * @see {@link HandlerErrorType}
     */
    readonly type: HandlerErrorType;
    /**
     * The raw error type string.
     *
     * For known types, this equals {@link type}. For unknown types, this preserves
     * the original wire string while {@link type} is set to `"UNKNOWN"`.
     */
    readonly rawErrorType: string;
    /**
     * Whether this error should be considered retryable.
     *
     * By default, the retry behavior is determined from the error type.
     * For example, by default, `INTERNAL` is retryable, but `UNAVAILABLE` is non-retryable.
     *
     * If specified, `retryableOverride` overrides the default retry behavior determined based on
     * the error type. Use {@link retryable} to determine the effective retry behavior.
     *
     * @see {@link retryable}.
     */
    readonly retryableOverride?: boolean;
    /**
     * Set if this error was constructed from a {@link Failure} object.
     *
     * Preserves the original failure for round-tripping through the wire format.
     */
    readonly originalFailure?: Failure;
    /**
     * Constructs a new {@link HandlerError}.
     *
     * @param type - The type of the error. Must be a known {@link HandlerErrorType}.
     * @param message - The message of the error.
     * @param options - Extra options for the error, including the cause and retryable override.
     *
     * @experimental
     */
    constructor(type: HandlerErrorType, message?: string | undefined, options?: HandlerErrorOptions);
    /**
     * Whether this error is retryable.
     *
     * This differs from the {@link retryableOverride} property in that `retryable` takes into
     * account the default behavior resulting from the error type, if no override is provided.
     *
     * @see {@link retryableOverride}.
     */
    get retryable(): boolean;
}
/**
 * Options for constructing a {@link HandlerError}.
 *
 * @experimental
 * @inline
 */
export interface HandlerErrorOptions {
    /**
     * Underlying cause of the error.
     */
    cause?: unknown;
    /**
     * Whether this error should be considered retryable.
     *
     * If not set, the retry behavior is determined from the error type.
     * For example, by default, `INTERNAL` is retryable, but `UNAVAILABLE` is non-retryable.
     */
    retryableOverride?: boolean | undefined;
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
    /**
     * The original error type string, preserving the raw wire value.
     *
     * For known types, this option is ignored.
     * When the error's type is set to `"UNKNOWN"`, this option is used to preserve the original wire string.
     */
    rawErrorType?: string;
}
/**
 * An error type associated with a {@link HandlerError}, defined according to the Nexus specification.
 *
 * @experimental
 */
export type HandlerErrorType = (typeof HandlerErrorType)[keyof typeof HandlerErrorType];
export declare const HandlerErrorType: {
    /**
     * The error type is unknown.
     *
     * Subsequent requests by the client are permissible.
     */
    readonly UNKNOWN: "UNKNOWN";
    /**
     * The handler cannot or will not process the request due to an apparent client error.
     *
     * Clients should not retry this request unless advised otherwise.
     */
    readonly BAD_REQUEST: "BAD_REQUEST";
    /**
     * The client did not supply valid authentication credentials for this request.
     *
     * Clients should not retry this request unless advised otherwise.
     */
    readonly UNAUTHENTICATED: "UNAUTHENTICATED";
    /**
     * The caller does not have permission to execute the specified operation.
     *
     * Clients should not retry this request unless advised otherwise.
     */
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    /**
     * The requested resource could not be found but may be available in the future.
     */
    readonly NOT_FOUND: "NOT_FOUND";
    /**
     * Returned by the server when it has given up handling a request. This may occur by enforcing
     * a client provided `Request-Timeout` or for any arbitrary reason such as enforcing some
     * configurable limit.
     *
     * Subsequent requests by the client are permissible.
     */
    readonly REQUEST_TIMEOUT: "REQUEST_TIMEOUT";
    /**
     * The request could not be made due to a conflict. This may happen when trying to create an
     * operation that has already been started.
     *
     * Clients should not retry this request unless advised otherwise.
     */
    readonly CONFLICT: "CONFLICT";
    /**
     * Some resource has been exhausted, perhaps a per-user quota, or perhaps the entire file system
     * is out of space.
     *
     * Subsequent requests by the client are permissible.
     */
    readonly RESOURCE_EXHAUSTED: "RESOURCE_EXHAUSTED";
    /**
     * An internal error occurred.
     *
     * Subsequent requests by the client are permissible.
     */
    readonly INTERNAL: "INTERNAL";
    /**
     * The server either does not recognize the request method, or it lacks the ability to fulfill the
     * request. Clients should not retry this request unless advised otherwise.
     */
    readonly NOT_IMPLEMENTED: "NOT_IMPLEMENTED";
    /**
     * The service is currently unavailable.
     *
     * Subsequent requests by the client are permissible.
     */
    readonly UNAVAILABLE: "UNAVAILABLE";
    /**
     * Used by gateways to report that a request to an upstream server has timed out.
     *
     * Subsequent requests by the client are permissible.
     */
    readonly UPSTREAM_TIMEOUT: "UPSTREAM_TIMEOUT";
};
