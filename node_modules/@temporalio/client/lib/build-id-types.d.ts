import type { temporal } from '@temporalio/proto';
/**
 * Operations that can be passed to {@link TaskQueueClient.updateBuildIdCompatibility}.
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export type BuildIdOperation = AddNewIdInNewDefaultSet | AddNewCompatibleVersion | PromoteSetByBuildId | PromoteBuildIdWithinSet | MergeSets;
/**
 * Adds a new Build Id into a new set, which will be used as the default set for
 * the queue. This means all new workflows will start on this Build Id.
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export interface AddNewIdInNewDefaultSet {
    operation: 'addNewIdInNewDefaultSet';
    buildId: string;
}
/**
 * Adds a new Build Id into an existing compatible set. The newly added ID becomes
 * the default for that compatible set, and thus new workflow tasks for workflows which have been
 * executing on workers in that set will now start on this new Build Id.
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export interface AddNewCompatibleVersion {
    operation: 'addNewCompatibleVersion';
    buildId: string;
    existingCompatibleBuildId: string;
    promoteSet?: boolean;
}
/**
 * Promotes a set of compatible Build Ids to become the current
 * default set for the task queue. Any Build Id in the set may be used to
 * target it.
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export interface PromoteSetByBuildId {
    operation: 'promoteSetByBuildId';
    buildId: string;
}
/**
 * Promotes a Build Id within an existing set to become the default ID for that
 * set.
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export interface PromoteBuildIdWithinSet {
    operation: 'promoteBuildIdWithinSet';
    buildId: string;
}
/**
 * Merges two sets into one set, thus declaring all the Build Ids in both as
 * compatible with one another. The default of the primary set is maintained as
 * the merged set's overall default.
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export interface MergeSets {
    operation: 'mergeSets';
    primaryBuildId: string;
    secondaryBuildId: string;
}
/**
 * Represents the sets of compatible Build Id versions associated with some
 * Task Queue, as fetched by {@link TaskQueueClient.getBuildIdCompatability}.
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export interface WorkerBuildIdVersionSets {
    /**
     * All version sets that were fetched for this task queue.
     */
    readonly versionSets: BuildIdVersionSet[];
    /**
     * Returns the default set of compatible Build Ids for the task queue these sets are
     * associated with.
     */
    defaultSet: BuildIdVersionSet;
    /**
     * Returns the overall default Build Id for the task queue these sets are
     * associated with.
     */
    defaultBuildId: string;
}
/**
 * Represents one set of compatible Build Ids.
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export interface BuildIdVersionSet {
    readonly buildIds: string[];
    readonly default: string;
}
export declare function versionSetsFromProto(resp: temporal.api.workflowservice.v1.GetWorkerBuildIdCompatibilityResponse): WorkerBuildIdVersionSets;
