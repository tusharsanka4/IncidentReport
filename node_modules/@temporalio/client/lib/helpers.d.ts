import type { ServiceError as GrpcServiceError } from '@grpc/grpc-js';
import type { LoadedDataConverter } from '@temporalio/common';
import type { Replace } from '@temporalio/common/lib/type-helpers';
import { temporal, google } from '@temporalio/proto';
import type { CountWorkflowExecution, RawWorkflowExecutionInfo, WorkflowExecutionInfo } from './types';
export declare function executionInfoFromRaw<T>(raw: RawWorkflowExecutionInfo, dataConverter: LoadedDataConverter, rawDataToEmbed: T, namespace: string): Promise<Replace<WorkflowExecutionInfo, {
    raw: T;
}>>;
export declare function decodeCountWorkflowExecutionsResponse(raw: temporal.api.workflowservice.v1.ICountWorkflowExecutionsResponse): CountWorkflowExecution;
export type ErrorDetailsName = `temporal.api.errordetails.v1.${keyof typeof temporal.api.errordetails.v1}`;
export type FailureName = `temporal.api.failure.v1.${keyof typeof temporal.api.failure.v1}`;
/**
 * If the error type can be determined based on embedded grpc error details,
 * then rethrow the appropriate TypeScript error. Otherwise do nothing.
 *
 * This function should be used before falling back to generic error handling
 * based on grpc error code. Very few error types are currently supported, but
 * this function will be expanded over time as more server error types are added.
 */
export declare function rethrowKnownErrorTypes(err: GrpcServiceError): void;
export declare function getGrpcStatusDetails(err: GrpcServiceError): google.rpc.Status['details'] | undefined;
/**
 * Try to extract the runId field from a gRPC ALREADY_EXISTS error's details containing
 * NexusOperationExecutionAlreadyStartedFailure. Returns undefined if the error details
 * do not include this failure type or cannot be decoded.
 */
export declare function extractNexusOperationAlreadyStartedRunId(err: GrpcServiceError): string | undefined;
export declare function trimGrpcTypeUrl(type_url: string | null | undefined): string;
