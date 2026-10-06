"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH_ACTIVATION_CALLBACK_HEADER_SIZE = exports.PATCH_ACTIVATION_CALLBACK_BUFFER_SIZE = void 0;
exports.makePatchActivationWorkflowInfoSnapshot = makePatchActivationWorkflowInfoSnapshot;
exports.invokePatchActivationCallbackWithSnapshot = invokePatchActivationCallbackWithSnapshot;
exports.invokePatchActivationCallback = invokePatchActivationCallback;
exports.writePatchActivationCallbackResult = writePatchActivationCallbackResult;
exports.writePatchActivationCallbackError = writePatchActivationCallbackError;
exports.completePatchActivationCallback = completePatchActivationCallback;
exports.waitForPatchActivationCallbackResult = waitForPatchActivationCallbackResult;
const common_1 = require("@temporalio/common");
const random_helpers_1 = require("@temporalio/workflow/lib/random-helpers");
// ts-prune-ignore-next (used by the workflow Worker thread entry point)
exports.PATCH_ACTIVATION_CALLBACK_BUFFER_SIZE = 64 * 1024;
exports.PATCH_ACTIVATION_CALLBACK_HEADER_SIZE = 3 * Int32Array.BYTES_PER_ELEMENT;
function makePatchActivationWorkflowInfoSnapshot(workflowInfo) {
    const snapshot = {
        ...workflowInfo,
        unsafe: {
            isReplaying: workflowInfo.unsafe.isReplaying,
            isReplayingHistoryEvents: workflowInfo.unsafe.isReplayingHistoryEvents,
        },
        // Structured cloning strips class prototypes, so preserve the public representation and
        // reconstruct TypedSearchAttributes when the Worker-side callback input is created.
        typedSearchAttributes: workflowInfo.typedSearchAttributes.toJSON(),
    };
    return structuredClone(snapshot);
}
function makePatchActivationInput(workflowInfo, patchId) {
    const info = Object.freeze({
        ...workflowInfo,
        typedSearchAttributes: new common_1.TypedSearchAttributes(workflowInfo.typedSearchAttributes),
        unsafe: Object.freeze({
            ...workflowInfo.unsafe,
            now: Date.now,
            random: Object.freeze((0, random_helpers_1.createUnsafeRandomSource)(Math.random)),
        }),
    });
    return Object.freeze({ workflowInfo: info, patchId });
}
function invokePatchActivationCallbackWithSnapshot(callback, workflowInfo, patchId) {
    const result = callback(makePatchActivationInput(workflowInfo, patchId));
    if (typeof result !== 'boolean') {
        throw new TypeError(`patchActivationCallback must return a boolean, got ${typeof result}`);
    }
    return result;
}
function invokePatchActivationCallback(callback, workflowInfo, patchId) {
    return invokePatchActivationCallbackWithSnapshot(callback, makePatchActivationWorkflowInfoSnapshot(workflowInfo), patchId);
}
function getHeader(resultBuffer) {
    return new Int32Array(resultBuffer, 0, 3);
}
function writePatchActivationCallbackResult(resultBuffer, result) {
    Atomics.store(getHeader(resultBuffer), 1, result ? 1 /* PatchActivationCallbackStatus.True */ : 2 /* PatchActivationCallbackStatus.False */);
}
function writePatchActivationCallbackError(resultBuffer, error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    const encoded = new TextEncoder().encode(message);
    const output = new Uint8Array(resultBuffer, exports.PATCH_ACTIVATION_CALLBACK_HEADER_SIZE);
    const length = Math.min(encoded.length, output.length);
    output.set(encoded.subarray(0, length));
    const header = getHeader(resultBuffer);
    Atomics.store(header, 2, length);
    Atomics.store(header, 1, 3 /* PatchActivationCallbackStatus.Error */);
}
function completePatchActivationCallback(resultBuffer) {
    const header = getHeader(resultBuffer);
    Atomics.store(header, 0, 1);
    Atomics.notify(header, 0);
}
// ts-prune-ignore-next (used by the workflow Worker thread entry point)
function waitForPatchActivationCallbackResult(resultBuffer) {
    const header = getHeader(resultBuffer);
    Atomics.wait(header, 0, 0 /* PatchActivationCallbackStatus.Pending */);
    const status = Atomics.load(header, 1);
    if (status === 1 /* PatchActivationCallbackStatus.True */)
        return true;
    if (status === 2 /* PatchActivationCallbackStatus.False */)
        return false;
    if (status === 3 /* PatchActivationCallbackStatus.Error */) {
        const length = Atomics.load(header, 2);
        const bytes = new Uint8Array(resultBuffer, exports.PATCH_ACTIVATION_CALLBACK_HEADER_SIZE, length);
        throw new Error(new TextDecoder().decode(bytes));
    }
    throw new common_1.IllegalStateError(`Invalid patch activation callback response status: ${status}`);
}
//# sourceMappingURL=patch-activation-callback.js.map