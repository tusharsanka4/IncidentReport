"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeActivityCancellationType = exports.encodeActivityCancellationType = exports.ActivityCancellationType = void 0;
const internal_workflow_1 = require("./internal-workflow");
// Note: The types defined in this file are here for legacy reasons. They should have been defined
// in the 'workflow' package, instead of 'common'. They are now reexported from the 'workflow'
// package, which is the preferred way to import them, but we unfortunately can't remove them from
// here as that would be a breaking change.
/**
 * Determines:
 * - whether cancellation requests should be propagated from the current Workflow to the Activity; and
 * - when should the Activity cancellation be reported to Workflow (i.e. at which moment should the
 *   Activity call's promise fail with an `ActivityFailure`, with `cause` set to a `CancelledFailure`).
 *
 * Note that this setting only applies to cancellation originating from cancellation being
 * externally requested on the Workflow itself, or from internal cancellation of the
 * `CancellationScope` in which the Activity call was made. Termination of a Workflow Execution
 * always results in cancellation of its outstanding Activity executions, regardless of those
 * Activities' {@link ActivityCancellationType} settings.
 *
 * @default ActivityCancellationType.WAIT_CANCELLATION_COMPLETED
 */
// MAINTENANCE: Keep this typedoc in sync with the `ActivityOptions.cancellationType` and
//              `LocalActivityOptions.cancellationType` fields later in this file.
exports.ActivityCancellationType = {
    /**
     * Do not propagate cancellation requests to the Activity, and immediately report cancellation
     * to the caller.
     */
    ABANDON: 'ABANDON',
    /**
     * Propagate cancellation request from the Workflow to the Activity, yet _immediately_ report
     * cancellation to the caller, i.e. without waiting for the server to confirm the cancellation
     * request.
     *
     * Note that this cancellation type provides no guarantee, from the Workflow-side, that the
     * cancellation request will actually be delivered to the Activity; e.g. the calling Workflow
     * may exit before the delivery is completed, or the Activity may complete (either successfully
     * or uncessfully) before the cancellation is delivered, resulting in a situation where the
     * workflow thinks the activity was cancelled, but the activity actually completed successfully.
     *
     * To ensure that the Workflow is properly informed of the Activity's final state (i.e. either
     * completion or cancellation), use {@link WAIT_CANCELLATION_COMPLETED}.
     */
    TRY_CANCEL: 'TRY_CANCEL',
    /**
     * Propagate cancellation request from the Workflow to the Activity, and wait for the activity
     * to complete its execution (either successfully, uncessfully, or as cancelled).
     *
     * Note that the Activity must heartbeat to receive a cancellation notification. This can block
     * the Workflow's cancellation for a long time if the Activity doesn't heartbeat or chooses to
     * ignore the cancellation request.
     */
    WAIT_CANCELLATION_COMPLETED: 'WAIT_CANCELLATION_COMPLETED',
};
_a = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.ActivityCancellationType.TRY_CANCEL]: 0,
    [exports.ActivityCancellationType.WAIT_CANCELLATION_COMPLETED]: 1,
    [exports.ActivityCancellationType.ABANDON]: 2,
}, ''), exports.encodeActivityCancellationType = _a[0], exports.decodeActivityCancellationType = _a[1];
//# sourceMappingURL=activity-options.js.map