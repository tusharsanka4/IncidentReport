import type { coresdk } from '@temporalio/proto';
export interface ActivityCancellationDetailsHolder {
    details?: ActivityCancellationDetails;
}
export interface ActivityCancellationDetailsOptions {
    notFound?: boolean;
    cancelRequested?: boolean;
    paused?: boolean;
    timedOut?: boolean;
    workerShutdown?: boolean;
    reset?: boolean;
}
/**
 * Provides the reasons for the activity's cancellation. Cancellation details are set once and do not change once set.
 */
export declare class ActivityCancellationDetails {
    readonly notFound: boolean;
    readonly cancelRequested: boolean;
    readonly paused: boolean;
    readonly timedOut: boolean;
    readonly workerShutdown: boolean;
    readonly reset: boolean;
    constructor(options?: ActivityCancellationDetailsOptions);
    static fromProto(proto: coresdk.activity_task.IActivityCancellationDetails | null | undefined): ActivityCancellationDetails;
}
