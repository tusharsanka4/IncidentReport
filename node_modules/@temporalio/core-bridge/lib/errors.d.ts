import * as grpc from '@grpc/grpc-js';
import { IllegalStateError } from '@temporalio/common';
/**
 * The worker has been shut down
 */
export declare class ShutdownError extends Error {
}
/**
 * Thrown after shutdown was requested as a response to a poll function, JS should stop polling
 * once this error is encountered
 */
export declare class TransportError extends Error {
}
/**
 * Something unexpected happened, considered fatal
 */
export declare class UnexpectedError extends Error {
    cause?: unknown;
    constructor(message: string, cause?: unknown);
}
export interface NativeServiceError {
    name: 'ServiceError';
    message: string;
    code: number;
    details: string;
    metadata: Record<string, Buffer | string>;
    stack?: string;
}
/**
 * A gRPC call failed. The error carries the gRPC status code, message, and other details.
 */
export declare class ServiceError extends Error implements grpc.ServiceError {
    readonly code: grpc.StatusObject['code'];
    readonly details: string;
    readonly metadata: grpc.Metadata;
    constructor(message: string, code: grpc.StatusObject['code'], details: string, metadata: grpc.Metadata);
    static fromNative(err: NativeServiceError): ServiceError;
}
/**
 * Something unexpected happened, considered fatal
 */
export declare class NativePromiseDroppedError extends UnexpectedError {
    constructor(message: string);
}
export { IllegalStateError };
export declare function convertFromNamedError(e: unknown, keepStackTrace: boolean): unknown;
