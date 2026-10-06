import { native } from '@temporalio/core-bridge';
import type { Duration } from '@temporalio/common/lib/time';
import type { Logger, WorkerDeploymentVersion } from '@temporalio/common';
/**
 * A worker tuner allows the customization of the performance characteristics of workers by
 * controlling how "slots" are handed out for different task types. In order to poll for and then
 * run tasks, a slot must first be reserved by the {@link SlotSupplier} returned by the tuner.
 */
export type WorkerTuner = ResourceBasedTuner | ResourceBasedTunerWithController | TunerHolder;
/**
 * This tuner allows for different slot suppliers for different slot types.
 */
export interface TunerHolder {
    workflowTaskSlotSupplier: SlotSupplier<WorkflowSlotInfo>;
    activityTaskSlotSupplier: SlotSupplier<ActivitySlotInfo>;
    localActivityTaskSlotSupplier: SlotSupplier<LocalActivitySlotInfo>;
    nexusTaskSlotSupplier: SlotSupplier<NexusSlotInfo>;
}
/**
 * Controls how slots are handed out for a specific task type.
 */
export type SlotSupplier<SI extends SlotInfo> = ResourceBasedSlotsForType | FixedSizeSlotSupplier | CustomSlotSupplier<SI>;
/**
 * This tuner attempts to maintain certain levels of resource usage when under load. You do not
 * need more than one instance of this when using it for multiple slot types.
 */
export interface ResourceBasedTuner extends ResourceBasedTunerSlotOptions, ResourceBasedTunerOptionsConfig {
}
/**
 * A resource-based tuner that uses a controller which may be shared by multiple Workers.
 */
export interface ResourceBasedTunerWithController extends ResourceBasedTunerSlotOptions, ResourceBasedControllerConfig {
}
interface ResourceBasedTunerSlotOptions {
    /**
     * Options for workflow task slots. Defaults to a minimum of 2 slots and a maximum of 1000 slots
     * with no ramp throttle
     */
    workflowTaskSlotOptions?: ResourceBasedSlotOptions;
    /**
     * Options for activity task slots. Defaults to a minimum of 1 slots and a maximum of 2000 slots
     * with 50ms ramp throttle
     */
    activityTaskSlotOptions?: ResourceBasedSlotOptions;
    /**
     * Options for local activity task slots. Defaults to a minimum of 1 slots and a maximum of 2000
     * slots with 50ms ramp throttle
     */
    localActivityTaskSlotOptions?: ResourceBasedSlotOptions;
    /**
     * Options for Nexus task slots. Defaults to a minimum of 1 slots and a maximum of 2000
     * slots with 50ms ramp throttle
     */
    nexusTaskSlotOptions?: ResourceBasedSlotOptions;
}
interface ResourceBasedTunerOptionsConfig {
    /** Options used to construct a controller scoped to this tuner. */
    tunerOptions: ResourceBasedTunerOptions;
    controller?: never;
}
interface ResourceBasedControllerConfig {
    /** A controller that may be shared by multiple tuners and Workers. */
    controller: ResourceBasedController;
    tunerOptions?: never;
}
type ResourceBasedTunerConfig = ResourceBasedTunerOptionsConfig | ResourceBasedControllerConfig;
/**
 * Options for a {@link ResourceBasedTuner} to control target resource usage
 */
export interface ResourceBasedTunerOptions {
    targetMemoryUsage: number;
    targetCpuUsage: number;
}
/**
 * Coordinates resource-based slot allocation using a shared resource sampler and PID controller.
 *
 * Share one instance across resource-based tuners to enforce a single resource target across
 * multiple Workers in the same process.
 */
export declare class ResourceBasedController {
    private readonly nativeController;
    private constructor();
    /** Create a resource controller with the given target resource usage. */
    static create(options: ResourceBasedTunerOptions): ResourceBasedController;
}
/**
 * Options for a specific slot type within a {@link ResourceBasedSlotsForType}
 */
export interface ResourceBasedSlotOptions {
    /**
     * Amount of slots that will be issued regardless of any other checks.
     * Defaults to 2 for workflow tasks and 1 for activity tasks.
     */
    minimumSlots?: number;
    /**
     * Maximum amount of slots permitted
     * Defaults to 1000 for workflow tasks and 2000 for activity tasks.
     */
    maximumSlots?: number;
    /**
     * Minimum time we will wait (after passing the minimum slots number) between handing out new
     * slots. Defaults to 10ms for workflow tasks and 50ms for activity tasks.
     */
    rampThrottle?: Duration;
}
/**
 * Resource based slot supplier options for a specific kind of slot.
 */
export type ResourceBasedSlotsForType = ResourceBasedSlotOptions & ResourceBasedTunerConfig & {
    type: 'resource-based';
};
/**
 * A fixed-size slot supplier that will never issue more than a fixed number of slots.
 */
export interface FixedSizeSlotSupplier {
    type: 'fixed-size';
    numSlots: number;
}
/**
 * The interface can be implemented to provide custom slot supplier behavior.
 */
export interface CustomSlotSupplier<SI extends SlotInfo> {
    type: 'custom';
    /**
     * This function is called before polling for new tasks. Your implementation should return a permit
     * when a slot is available.
     *
     * Note: This function is called asynchronously from the Rust side. It should return a Promise that
     * resolves when a slot is available. You can use async/await or return a Promise directly.
     *
     * The only acceptable exception to throw is AbortError, any other exceptions thrown will be
     * logged and ignored.
     *
     * The value inside the returned promise should be an object, however other types will still count
     * as having issued a permit. Including undefined or null. Returning undefined or null does *not*
     * mean you have not issued a permit. Implementations are expected to block until a meaningful
     * permit can be issued.
     *
     * @param ctx The context for slot reservation.
     * @param abortSignal The SDK may decide to abort the reservation request if it's no longer
     *   needed. Implementations may clean up and then must reject the promise with AbortError.
     * @returns A promise that resolves to a permit to use the slot which may be populated with your own data.
     */
    reserveSlot(ctx: SlotReserveContext, abortSignal: AbortSignal): Promise<SlotPermit>;
    /**
     * This function is called when trying to reserve slots for "eager" workflow and activity tasks.
     * Eager tasks are those which are returned as a result of completing a workflow task, rather than
     * from polling. Your implementation must not block, and if a slot is available, return a permit
     * to use that slot.
     *
     * @param ctx The context for slot reservation.
     * @returns Maybe a permit to use the slot which may be populated with your own data.
     */
    tryReserveSlot(ctx: SlotReserveContext): SlotPermit | null;
    /**
     * This function is called once a slot is actually being used to process some task, which may be
     * some time after the slot was reserved originally. For example, if there is no work for a
     * worker, a number of slots equal to the number of active pollers may already be reserved, but
     * none of them are being used yet. This call should be non-blocking.
     *
     * @param ctx The context for marking a slot as used.
     */
    markSlotUsed(ctx: SlotMarkUsedContext<SI>): void;
    /**
     * This function is called once a permit is no longer needed. This could be because the task has
     * finished, whether successfully or not, or because the slot was no longer needed (ex: the number
     * of active pollers decreased). This call should be non-blocking.
     *
     * @param ctx The context for releasing a slot.
     */
    releaseSlot(ctx: SlotReleaseContext<SI>): void;
}
export type SlotInfo = WorkflowSlotInfo | ActivitySlotInfo | LocalActivitySlotInfo | NexusSlotInfo;
export interface WorkflowSlotInfo {
    type: 'workflow';
    workflowType: string;
    isSticky: boolean;
}
export interface ActivitySlotInfo {
    type: 'activity';
    activityType: string;
}
export interface LocalActivitySlotInfo {
    type: 'local-activity';
    activityType: string;
}
export interface NexusSlotInfo {
    type: 'nexus';
    service: string;
    operation: string;
}
/**
 * A permit to use a slot.
 */
export interface SlotPermit {
}
/**
 * Context for reserving a slot.
 */
export interface SlotReserveContext {
    /**
     * The type of slot trying to be reserved
     */
    slotType: SlotInfo['type'];
    /**
     * The name of the task queue for which this reservation request is associated
     */
    taskQueue: string;
    /**
     * The identity of the worker that is requesting the reservation
     */
    workerIdentity: string;
    /**
     * The build id of the worker that is requesting the reservation
     *
     * @deprecated Worker Versioning is now deprecated. Use {@link workerDeploymentVersion} instead: https://docs.temporal.io/worker-deployments
     */
    workerBuildId: string;
    /**
     * The deployment version of the worker that is requesting the reservation
     */
    workerDeploymentVersion?: WorkerDeploymentVersion;
    /**
     * True iff this is a reservation for a sticky poll for a workflow task
     */
    isSticky: boolean;
}
/**
 * Context for marking a slot as used.
 */
export interface SlotMarkUsedContext<SI extends SlotInfo> {
    /**
     * Info about the task that will be using the slot
     */
    slotInfo: SI;
    /**
     * The permit that was issued when the slot was reserved
     */
    permit: SlotPermit;
}
/**
 * Context for releasing a slot.
 */
export interface SlotReleaseContext<SI extends SlotInfo> {
    /**
     * Info about the task that used this slot, if any. A slot may be released without being used in
     * the event a poll times out.
     */
    slotInfo?: SI;
    /**
     * The permit that was issued when the slot was reserved
     */
    permit: SlotPermit;
}
export declare function asNativeTuner(tuner: WorkerTuner, logger: Logger): native.WorkerTunerOptions;
export {};
