"use strict";
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeNexusOperationCancellationState = exports.encodeNexusOperationCancellationState = exports.NexusOperationCancellationState = exports.decodePendingNexusOperationState = exports.encodePendingNexusOperationState = exports.PendingNexusOperationState = exports.decodeNexusOperationExecutionStatus = exports.encodeNexusOperationExecutionStatus = exports.NexusOperationExecutionStatus = exports.decodeNexusOperationIdConflictPolicy = exports.encodeNexusOperationIdConflictPolicy = exports.NexusOperationIdConflictPolicy = exports.decodeNexusOperationIdReusePolicy = exports.encodeNexusOperationIdReusePolicy = exports.NexusOperationIdReusePolicy = void 0;
const internal_workflow_1 = require("@temporalio/common/lib/internal-workflow");
/**
 * Defines whether to allow re-using an operation ID from a previously *completed* Nexus operation.
 *
 * See {@link NexusOperationIdConflictPolicy} for handling ID duplication with a *running* operation.
 */
exports.NexusOperationIdReusePolicy = {
    ALLOW_DUPLICATE: 'ALLOW_DUPLICATE',
    ALLOW_DUPLICATE_FAILED_ONLY: 'ALLOW_DUPLICATE_FAILED_ONLY',
    REJECT_DUPLICATE: 'REJECT_DUPLICATE',
};
_a = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.NexusOperationIdReusePolicy.ALLOW_DUPLICATE]: 1,
    [exports.NexusOperationIdReusePolicy.ALLOW_DUPLICATE_FAILED_ONLY]: 2,
    [exports.NexusOperationIdReusePolicy.REJECT_DUPLICATE]: 3,
    UNSPECIFIED: 0,
}, 'NEXUS_OPERATION_ID_REUSE_POLICY_'), exports.encodeNexusOperationIdReusePolicy = _a[0], exports.decodeNexusOperationIdReusePolicy = _a[1];
/**
 * Defines how to resolve an operation ID conflict with a *running* Nexus operation.
 *
 * See {@link NexusOperationIdReusePolicy} for handling operation ID duplication with a *closed* operation.
 */
exports.NexusOperationIdConflictPolicy = {
    FAIL: 'FAIL',
    USE_EXISTING: 'USE_EXISTING',
};
_b = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.NexusOperationIdConflictPolicy.FAIL]: 1,
    [exports.NexusOperationIdConflictPolicy.USE_EXISTING]: 2,
    UNSPECIFIED: 0,
}, 'NEXUS_OPERATION_ID_CONFLICT_POLICY_'), exports.encodeNexusOperationIdConflictPolicy = _b[0], exports.decodeNexusOperationIdConflictPolicy = _b[1];
/**
 * A general status for a Nexus operation, indicating whether it is currently running or in a terminal state.
 */
exports.NexusOperationExecutionStatus = {
    RUNNING: 'RUNNING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELED: 'CANCELED',
    TERMINATED: 'TERMINATED',
    TIMED_OUT: 'TIMED_OUT',
};
_c = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.NexusOperationExecutionStatus.RUNNING]: 1,
    [exports.NexusOperationExecutionStatus.COMPLETED]: 2,
    [exports.NexusOperationExecutionStatus.FAILED]: 3,
    [exports.NexusOperationExecutionStatus.CANCELED]: 4,
    [exports.NexusOperationExecutionStatus.TERMINATED]: 5,
    [exports.NexusOperationExecutionStatus.TIMED_OUT]: 6,
    UNSPECIFIED: 0,
}, 'NEXUS_OPERATION_EXECUTION_STATUS_'), exports.encodeNexusOperationExecutionStatus = _c[0], exports.decodeNexusOperationExecutionStatus = _c[1];
/**
 * A more detailed breakdown of {@link NexusOperationExecutionStatus.RUNNING}.
 */
exports.PendingNexusOperationState = {
    SCHEDULED: 'SCHEDULED',
    BACKING_OFF: 'BACKING_OFF',
    STARTED: 'STARTED',
    BLOCKED: 'BLOCKED',
};
_d = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.PendingNexusOperationState.SCHEDULED]: 1,
    [exports.PendingNexusOperationState.BACKING_OFF]: 2,
    [exports.PendingNexusOperationState.STARTED]: 3,
    [exports.PendingNexusOperationState.BLOCKED]: 4,
    UNSPECIFIED: 0,
}, 'PENDING_NEXUS_OPERATION_STATE_'), exports.encodePendingNexusOperationState = _d[0], exports.decodePendingNexusOperationState = _d[1];
/**
 * State of a Nexus operation cancellation.
 */
exports.NexusOperationCancellationState = {
    SCHEDULED: 'SCHEDULED',
    BACKING_OFF: 'BACKING_OFF',
    SUCCEEDED: 'SUCCEEDED',
    FAILED: 'FAILED',
    TIMED_OUT: 'TIMED_OUT',
    BLOCKED: 'BLOCKED',
};
_e = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.NexusOperationCancellationState.SCHEDULED]: 1,
    [exports.NexusOperationCancellationState.BACKING_OFF]: 2,
    [exports.NexusOperationCancellationState.SUCCEEDED]: 3,
    [exports.NexusOperationCancellationState.FAILED]: 4,
    [exports.NexusOperationCancellationState.TIMED_OUT]: 5,
    [exports.NexusOperationCancellationState.BLOCKED]: 6,
    UNSPECIFIED: 0,
}, 'NEXUS_OPERATION_CANCELLATION_STATE_'), exports.encodeNexusOperationCancellationState = _e[0], exports.decodeNexusOperationCancellationState = _e[1];
//# sourceMappingURL=nexus-types.js.map