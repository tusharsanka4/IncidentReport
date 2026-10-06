import type { RequireAtLeastOne } from '@temporalio/common/lib/type-helpers';
import type { temporal } from '@temporalio/proto';
import type { BaseClientOptions, LoadedWithDefaults } from './base-client';
import { BaseClient } from './base-client';
import type { WorkflowService } from './types';
import type { BuildIdOperation, WorkerBuildIdVersionSets } from './build-id-types';
type GetWorkerTaskReachabilityResponse = temporal.api.workflowservice.v1.GetWorkerTaskReachabilityResponse;
/**
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export type TaskQueueClientOptions = BaseClientOptions;
/**
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export type LoadedTaskQueueClientOptions = LoadedWithDefaults<TaskQueueClientOptions>;
/**
 * A stand-in for a Build Id for unversioned Workers
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export declare const UnversionedBuildId: unique symbol;
export type UnversionedBuildIdType = typeof UnversionedBuildId;
/**
 * Client for starting Workflow executions and creating Workflow handles
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export declare class TaskQueueClient extends BaseClient {
    readonly options: LoadedTaskQueueClientOptions;
    constructor(options?: TaskQueueClientOptions);
    /**
     * Raw gRPC access to the Temporal service.
     *
     * **NOTE**: The namespace provided in {@link options} is **not** automatically set on requests
     * using this service attribute.
     */
    get workflowService(): WorkflowService;
    /**
     * Used to add new Build Ids or otherwise update the relative compatibility of Build Ids as
     * defined on a specific task queue for the Worker Versioning feature. For more on this feature,
     * see https://docs.temporal.io/workers#worker-versioning
     *
     * @param taskQueue The task queue to make changes to.
     * @param operation The operation to be performed.
     *
     * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
     */
    updateBuildIdCompatibility(taskQueue: string, operation: BuildIdOperation): Promise<void>;
    /**
     * Fetch the sets of compatible Build Ids for a given task queue.
     *
     * @param taskQueue The task queue to fetch the compatibility information for.
     * @returns The sets of compatible Build Ids for the given task queue, or undefined if the queue
     *          has no Build Ids defined on it.
     *
     * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
     */
    getBuildIdCompatability(taskQueue: string): Promise<WorkerBuildIdVersionSets | undefined>;
    /**
     * Fetches task reachability to determine whether a worker may be retired. The request may specify
     * task queues to query for or let the server fetch all task queues mapped to the given build IDs.
     *
     * When requesting a large number of task queues or all task queues associated with the given
     * build ids in a namespace, all task queues will be listed in the response but some of them may
     * not contain reachability information due to a server enforced limit. When reaching the limit,
     * task queues that reachability information could not be retrieved for will be marked with a
     * `NotFetched` entry in {@link BuildIdReachability.taskQueueReachability}. The caller may issue
     * another call to get the reachability for those task queues.
     *
     * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
     */
    getReachability(options: ReachabilityOptions): Promise<ReachabilityResponse>;
    protected rethrowGrpcError(err: unknown, fallbackMessage: string): never;
}
/**
 * Options for {@link TaskQueueClient.getReachability}
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export type ReachabilityOptions = RequireAtLeastOne<BaseReachabilityOptions, 'buildIds' | 'taskQueues'>;
/**
 * There are different types of reachability:
 *   - `NEW_WORKFLOWS`: The Build Id might be used by new workflows
 *   - `EXISTING_WORKFLOWS` The Build Id might be used by open workflows and/or closed workflows.
 *   - `OPEN_WORKFLOWS` The Build Id might be used by open workflows
 *   - `CLOSED_WORKFLOWS` The Build Id might be used by closed workflows
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export declare const ReachabilityType: {
    /** The Build Id might be used by new workflows. */
    readonly NEW_WORKFLOWS: "NEW_WORKFLOWS";
    /** The Build Id might be used by open workflows and/or closed workflows. */
    readonly EXISTING_WORKFLOWS: "EXISTING_WORKFLOWS";
    /** The Build Id might be used by open workflows. */
    readonly OPEN_WORKFLOWS: "OPEN_WORKFLOWS";
    /** The Build Id might be used by closed workflows. */
    readonly CLOSED_WORKFLOWS: "CLOSED_WORKFLOWS";
};
export type ReachabilityType = (typeof ReachabilityType)[keyof typeof ReachabilityType];
export declare const encodeTaskReachability: (input: temporal.api.enums.v1.TaskReachability | "NEW_WORKFLOWS" | "EXISTING_WORKFLOWS" | "OPEN_WORKFLOWS" | "CLOSED_WORKFLOWS" | "TASK_REACHABILITY_NEW_WORKFLOWS" | "TASK_REACHABILITY_EXISTING_WORKFLOWS" | "TASK_REACHABILITY_OPEN_WORKFLOWS" | "TASK_REACHABILITY_CLOSED_WORKFLOWS" | null | undefined) => temporal.api.enums.v1.TaskReachability | undefined, decodeTaskReachability: (input: temporal.api.enums.v1.TaskReachability | null | undefined) => "NEW_WORKFLOWS" | "EXISTING_WORKFLOWS" | "OPEN_WORKFLOWS" | "CLOSED_WORKFLOWS" | undefined;
/**
 * See {@link ReachabilityOptions}
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export interface BaseReachabilityOptions {
    /**
     * A list of build ids to query the reachability of. Currently, at least one Build Id must be
     * specified, but this restriction may be lifted in the future.
     */
    buildIds: (string | UnversionedBuildIdType)[];
    /**
     * A list of task queues with Build Ids defined on them that the request is
     * concerned with.
     */
    taskQueues?: string[];
    /** The kind of reachability this request is concerned with. */
    reachability?: ReachabilityType;
}
/**
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export interface ReachabilityResponse {
    /** Maps Build Ids to their reachability information. */
    buildIdReachability: Record<string | UnversionedBuildIdType, BuildIdReachability>;
}
/**
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export type ReachabilityTypeResponse = ReachabilityType | 'NOT_FETCHED';
/**
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export interface BuildIdReachability {
    /**
     *  Maps Task Queue names to how the Build Id may be reachable from them. If they are not
     *  reachable, the map value will be an empty array.
     */
    taskQueueReachability: Record<string, ReachabilityTypeResponse[]>;
}
export declare function reachabilityResponseFromProto(resp: GetWorkerTaskReachabilityResponse): ReachabilityResponse;
/**
 * Thrown when one or more Build Ids are not found while using the {@link TaskQueueClient}.
 *
 * It could be because:
 * - Id passed is incorrect
 * - Build Id has been scavenged by the server.
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export declare class BuildIdNotFoundError extends Error {
}
export {};
