"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptWorkflowClientInterceptor = adaptWorkflowClientInterceptor;
function adaptWorkflowClientInterceptor(i) {
    return adaptLegacyStartInterceptor(i);
}
// Adapt legacy `start` interceptors to the new `startWithDetails` interceptor.
function adaptLegacyStartInterceptor(i) {
    // If it already has the new method, or doesn't have the legacy one, no adaptation is needed.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    if (i.startWithDetails || !i.start) {
        return i;
    }
    // This interceptor has a legacy `start` but not `startWithDetails`. We'll adapt it.
    return {
        ...i,
        startWithDetails: async (input, next) => {
            let downstreamOut;
            // Patched `next` for legacy `start` interceptors.
            // Captures the full `WorkflowStartOutput` while returning `runId` as a string.
            const patchedNext = async (patchedInput) => {
                downstreamOut = await next(patchedInput);
                return downstreamOut.runId;
            };
            const runIdFromLegacyInterceptor = await i.start(input, patchedNext); // eslint-disable-line @typescript-eslint/no-deprecated
            // If the interceptor short-circuited (didn't call `next`), `downstreamOut` will be undefined.
            // In that case, we can't have an eager start.
            if (downstreamOut === undefined) {
                return { runId: runIdFromLegacyInterceptor, eagerlyStarted: false };
            }
            // If `next` was called, honor the `runId` from the legacy interceptor but preserve
            // the `eagerlyStarted` status from the actual downstream call.
            return { ...downstreamOut, runId: runIdFromLegacyInterceptor };
        },
    };
}
//# sourceMappingURL=interceptor-adapters.js.map