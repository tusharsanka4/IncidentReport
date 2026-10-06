"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlerErrorType = exports.HandlerError = void 0;
const symbol_instanceof_1 = require("../internal/symbol-instanceof");
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
class HandlerError extends Error {
    /**
     * One of the predefined error types.
     *
     * If the constructor received an unknown string, this will be `"UNKNOWN"`.
     * Use {@link rawErrorType} to access the original string.
     *
     * @see {@link HandlerErrorType}
     */
    type;
    /**
     * The raw error type string.
     *
     * For known types, this equals {@link type}. For unknown types, this preserves
     * the original wire string while {@link type} is set to `"UNKNOWN"`.
     */
    rawErrorType;
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
    retryableOverride;
    /**
     * Set if this error was constructed from a {@link Failure} object.
     *
     * Preserves the original failure for round-tripping through the wire format.
     */
    originalFailure;
    /**
     * Constructs a new {@link HandlerError}.
     *
     * @param type - The type of the error. Must be a known {@link HandlerErrorType}.
     * @param message - The message of the error.
     * @param options - Extra options for the error, including the cause and retryable override.
     *
     * @experimental
     */
    constructor(type, message, options) {
        const actualMessage = message || `Handler error: ${type}`;
        super(actualMessage, { cause: options?.cause });
        if (!Object.hasOwn(exports.HandlerErrorType, type)) {
            throw new TypeError(`Invalid HandlerErrorType: ${type}`);
        }
        this.type = type;
        this.rawErrorType = type === "UNKNOWN" ? (options?.rawErrorType ?? type) : type;
        this.retryableOverride = options?.retryableOverride;
        this.originalFailure = options?.originalFailure;
        if (options?.stackTrace !== undefined) {
            this.stack = options.stackTrace;
        }
    }
    /**
     * Whether this error is retryable.
     *
     * This differs from the {@link retryableOverride} property in that `retryable` takes into
     * account the default behavior resulting from the error type, if no override is provided.
     *
     * @see {@link retryableOverride}.
     */
    get retryable() {
        if (typeof this.retryableOverride === "boolean")
            return this.retryableOverride;
        switch (this.type) {
            case "BAD_REQUEST":
            case "UNAUTHENTICATED":
            case "UNAUTHORIZED":
            case "NOT_FOUND":
            case "NOT_IMPLEMENTED":
            case "CONFLICT":
                return false;
            case "UNAVAILABLE":
            case "UPSTREAM_TIMEOUT":
            case "RESOURCE_EXHAUSTED":
            case "INTERNAL":
            case "REQUEST_TIMEOUT":
            case "UNKNOWN":
                return true;
            default: {
                // Force a compile time error if missing a case
                const _noMissingCase = this.type;
                return true;
            }
        }
    }
}
exports.HandlerError = HandlerError;
(0, symbol_instanceof_1.injectSymbolBasedInstanceOf)(HandlerError, "HandlerError");
exports.HandlerErrorType = {
    /**
     * The error type is unknown.
     *
     * Subsequent requests by the client are permissible.
     */
    UNKNOWN: "UNKNOWN",
    /**
     * The handler cannot or will not process the request due to an apparent client error.
     *
     * Clients should not retry this request unless advised otherwise.
     */
    BAD_REQUEST: "BAD_REQUEST",
    /**
     * The client did not supply valid authentication credentials for this request.
     *
     * Clients should not retry this request unless advised otherwise.
     */
    UNAUTHENTICATED: "UNAUTHENTICATED",
    /**
     * The caller does not have permission to execute the specified operation.
     *
     * Clients should not retry this request unless advised otherwise.
     */
    UNAUTHORIZED: "UNAUTHORIZED",
    /**
     * The requested resource could not be found but may be available in the future.
     */
    NOT_FOUND: "NOT_FOUND",
    /**
     * Returned by the server when it has given up handling a request. This may occur by enforcing
     * a client provided `Request-Timeout` or for any arbitrary reason such as enforcing some
     * configurable limit.
     *
     * Subsequent requests by the client are permissible.
     */
    REQUEST_TIMEOUT: "REQUEST_TIMEOUT",
    /**
     * The request could not be made due to a conflict. This may happen when trying to create an
     * operation that has already been started.
     *
     * Clients should not retry this request unless advised otherwise.
     */
    CONFLICT: "CONFLICT",
    /**
     * Some resource has been exhausted, perhaps a per-user quota, or perhaps the entire file system
     * is out of space.
     *
     * Subsequent requests by the client are permissible.
     */
    RESOURCE_EXHAUSTED: "RESOURCE_EXHAUSTED",
    /**
     * An internal error occurred.
     *
     * Subsequent requests by the client are permissible.
     */
    INTERNAL: "INTERNAL",
    /**
     * The server either does not recognize the request method, or it lacks the ability to fulfill the
     * request. Clients should not retry this request unless advised otherwise.
     */
    NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
    /**
     * The service is currently unavailable.
     *
     * Subsequent requests by the client are permissible.
     */
    UNAVAILABLE: "UNAVAILABLE",
    /**
     * Used by gateways to report that a request to an upstream server has timed out.
     *
     * Subsequent requests by the client are permissible.
     */
    UPSTREAM_TIMEOUT: "UPSTREAM_TIMEOUT",
};
//# sourceMappingURL=handler-error.js.map