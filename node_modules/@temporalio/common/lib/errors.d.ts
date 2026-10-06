/**
 * Thrown from code that receives a value that is unexpected or that it's unable to handle.
 */
export declare class ValueError extends Error {
    readonly cause?: unknown;
    constructor(message: string | undefined, cause?: unknown);
}
/**
 * Thrown when a Payload Converter is misconfigured.
 */
export declare class PayloadConverterError extends ValueError {
}
/**
 * Signals that a requested operation can't be completed because it is illegal given the
 * current state of the object; e.g. trying to use a resource after it has been closed.
 */
export declare class IllegalStateError extends Error {
}
/**
 * Thrown when a Workflow with the given Id is not known to Temporal Server.
 * It could be because:
 * - Id passed is incorrect
 * - Workflow is closed (for some calls, e.g. `terminate`)
 * - Workflow was deleted from the Server after reaching its retention limit
 */
export declare class WorkflowNotFoundError extends Error {
    readonly workflowId: string;
    readonly runId: string | undefined;
    constructor(message: string, workflowId: string, runId: string | undefined);
}
/**
 * Thrown when the specified namespace is not known to Temporal Server.
 */
export declare class NamespaceNotFoundError extends Error {
    readonly namespace: string;
    constructor(namespace: string);
}
/**
 * Throw this error from an Activity in order to make the Worker forget about this Activity.
 *
 * The Activity can then be completed asynchronously (from anywhere—usually outside the Worker) using
 * the Client's activity handle.
 *
 * @example
 *
 * ```ts
 *import { CompleteAsyncError } from '@temporalio/activity';
 *
 *export async function myActivity(): Promise<never> {
 *  // ...
 *  throw new CompleteAsyncError();
 *}
 * ```
 */
export declare class CompleteAsyncError extends Error {
}
/**
 * Thrown when an inbound payload is detected as an external-storage reference
 * but no `ExternalStorage` is configured to resolve it.
 *
 * @experimental
 */
export declare class ExternalStorageNotConfiguredError extends Error {
    constructor(message?: string);
}
