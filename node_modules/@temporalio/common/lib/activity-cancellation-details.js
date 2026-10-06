"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityCancellationDetails = void 0;
/**
 * Provides the reasons for the activity's cancellation. Cancellation details are set once and do not change once set.
 */
class ActivityCancellationDetails {
    notFound;
    cancelRequested;
    paused;
    timedOut;
    workerShutdown;
    reset;
    constructor(options = {}) {
        this.notFound = options.notFound ?? false;
        this.cancelRequested = options.cancelRequested ?? false;
        this.paused = options.paused ?? false;
        this.timedOut = options.timedOut ?? false;
        this.workerShutdown = options.workerShutdown ?? false;
        this.reset = options.reset ?? false;
    }
    static fromProto(proto) {
        if (proto == null) {
            return new ActivityCancellationDetails();
        }
        return new ActivityCancellationDetails({
            notFound: proto.isNotFound ?? false,
            cancelRequested: proto.isCancelled ?? false,
            paused: proto.isPaused ?? false,
            timedOut: proto.isTimedOut ?? false,
            workerShutdown: proto.isWorkerShutdown ?? false,
            reset: proto.isReset ?? false,
        });
    }
}
exports.ActivityCancellationDetails = ActivityCancellationDetails;
//# sourceMappingURL=activity-cancellation-details.js.map