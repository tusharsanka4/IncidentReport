import type { coresdk, temporal } from '@temporalio/proto';
/**
 * Represents the version of a specific worker deployment.
 */
export interface WorkerDeploymentVersion {
    readonly buildId: string;
    readonly deploymentName: string;
}
/**
 * @returns The canonical representation of a deployment version, which is a string in the format
 * `deploymentName.buildId`.
 */
export declare function toCanonicalString(version: WorkerDeploymentVersion): string;
/**
 * Specifies when a workflow might move from a worker of one Build Id to another.
 *
 * * 'PINNED' - The workflow will be pinned to the current Build ID unless manually moved.
 * * 'AUTO_UPGRADE' - The workflow will automatically move to the latest version (default Build ID
 *    of the task queue) when the next task is dispatched.
 */
export declare const VersioningBehavior: {
    readonly PINNED: "PINNED";
    readonly AUTO_UPGRADE: "AUTO_UPGRADE";
};
export type VersioningBehavior = (typeof VersioningBehavior)[keyof typeof VersioningBehavior];
export declare const encodeVersioningBehavior: (input: "PINNED" | "AUTO_UPGRADE" | temporal.api.enums.v1.VersioningBehavior | "VERSIONING_BEHAVIOR_PINNED" | "VERSIONING_BEHAVIOR_AUTO_UPGRADE" | null | undefined) => temporal.api.enums.v1.VersioningBehavior | undefined, decodeVersioningBehavior: (input: temporal.api.enums.v1.VersioningBehavior | null | undefined) => "PINNED" | "AUTO_UPGRADE" | undefined;
/**
 * Represents versioning overrides. For example, when starting workflows.
 */
export type VersioningOverride = PinnedVersioningOverride | 'AUTO_UPGRADE';
/**
 * Workflow will be pinned to a specific deployment version.
 */
export interface PinnedVersioningOverride {
    /**
     * The worker deployment version to pin the workflow to.
     */
    pinnedTo: WorkerDeploymentVersion;
}
/**
 * The workflow will auto-upgrade to the current deployment version on the next workflow task.
 */
export type AutoUpgradeVersioningOverride = 'AUTO_UPGRADE';
/**
 * Defines the versioning behavior to be used by the first task of a new workflow run in a continue-as-new chain.
 *
 * AUTO_UPGRADE - Start the new run with AutoUpgrade behavior. Use the Target Version of the workflow's task queue at
 *   start-time, as AutoUpgrade workflows do. After the first workflow task completes, use whatever
 *   Versioning Behavior the workflow is annotated with in the workflow code.
 *
 *   Note that if the previous workflow had a Pinned override, that override will be inherited by the
 *   new workflow run regardless of the ContinueAsNewVersioningBehavior specified in the continue-as-new
 *   command. If a Pinned override is inherited by the new run, and the new run starts with AutoUpgrade
 *   behavior, the base version of the new run will be the Target Version as described above, but the
 *   effective version will be whatever is specified by the Versioning Override until the override is removed.
 *
 * USE_RAMPING_VERSION - Use the Ramping Version of the workflow's task queue at start time, regardless of the workflow's
 *   Target Version (according to f(workflow_id, ramp_percentage)). After the first workflow task completes,
 *   the workflow will use whatever Versioning Behavior it is annotated with. If there is no Ramping
 *   Version by the time that the first workflow task is dispatched, it will be sent to the Current Version.
 *
 *   It is highly discouraged to use this if the workflow is annotated with AutoUpgrade behavior, because
 *   this setting ONLY applies to the first task of the workflow. If, after the first task, the workflow
 *   is AutoUpgrade, it will behave like a normal AutoUpgrade workflow and go to the Target Version, which
 *   may be the Current Version instead of the Ramping Version.
 *
 *   Note that if the workflow being continued has a Pinned override, that override will be inherited by the
 *   new workflow run regardless of the ContinueAsNewVersioningBehavior specified in the continue-as-new
 *   command. Versioning Override always takes precedence until it's removed manually via UpdateWorkflowExecutionOptions.
 *
 * @experimental Versioning semantics with continue-as-new are experimental and may change in the future.
 */
export declare const InitialVersioningBehavior: {
    readonly AUTO_UPGRADE: "AUTO_UPGRADE";
    readonly USE_RAMPING_VERSION: "USE_RAMPING_VERSION";
};
export type InitialVersioningBehavior = (typeof InitialVersioningBehavior)[keyof typeof InitialVersioningBehavior];
export declare const encodeInitialVersioningBehavior: (input: "AUTO_UPGRADE" | "USE_RAMPING_VERSION" | temporal.api.enums.v1.ContinueAsNewVersioningBehavior | "CONTINUE_AS_NEW_VERSIONING_BEHAVIOR_AUTO_UPGRADE" | "CONTINUE_AS_NEW_VERSIONING_BEHAVIOR_USE_RAMPING_VERSION" | null | undefined) => temporal.api.enums.v1.ContinueAsNewVersioningBehavior | undefined, decodeInitialVersioningBehavior: (input: temporal.api.enums.v1.ContinueAsNewVersioningBehavior | null | undefined) => "AUTO_UPGRADE" | "USE_RAMPING_VERSION" | undefined;
/**
 * @internal
 */
export declare function convertDeploymentVersion(v: coresdk.common.IWorkerDeploymentVersion | null | undefined): WorkerDeploymentVersion | undefined;
