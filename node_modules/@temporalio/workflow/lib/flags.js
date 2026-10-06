"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SdkFlags = void 0;
exports.assertValidFlag = assertValidFlag;
const flagsRegistry = new Map();
exports.SdkFlags = {
    /**
     * This flag gates multiple fixes related to cancellation scopes and timers introduced in 1.10.2/1.11.0:
     * - Cancellation of a non-cancellable scope no longer propagates to children scopes
     *   (see https://github.com/temporalio/sdk-typescript/issues/1423).
     * - CancellationScope.withTimeout(fn) now cancel the timer if `fn` completes before expiration
     *   of the timeout, similar to how `condition(fn, timeout)` works.
     * - Timers created using setTimeout can now be intercepted.
     *
     * @since Introduced in 1.10.2/1.11.0. However, due to an SDK bug, SDKs v1.11.0 and v1.11.1 were not
     *        properly writing back the flags to history, possibly resulting in NDE on replay. We therefore
     *        consider that a WFT emitted by Worker v1.11.0 or v1.11.1 to implicitly have this flag on.
     */
    NonCancellableScopesAreShieldedFromPropagation: defineFlag(1, true, [buildIdSdkVersionMatches(/1\.11\.[01]/)]),
    /**
     * Prior to 1.11.0, when processing a Workflow activation, the SDK would execute `notifyHasPatch`
     * and `signalWorkflow` jobs in distinct phases, before other types of jobs. The primary reason
     * behind that multi-phase algorithm was to avoid the possibility that a Workflow execution might
     * complete before all incoming signals have been dispatched (at least to the point that the
     * _synchronous_ part of the handler function has been executed).
     *
     * This flag replaces that multi-phase algorithm with a simpler one where jobs are simply sorted as
     * `(signals and updates) -> others`, but without processing them as distinct batches (i.e. without
     * leaving/reentering the VM context between each group, which automatically triggers the execution
     * of all outstanding microtasks). That single-phase approach resolves a number of quirks of the
     * former algorithm, and yet still satisfies to the original requirement of ensuring that every
     * `signalWorkflow` jobs - and now `doUpdate` jobs as well - have been given a proper chance to
     * execute before the Workflow main function might completes.
     *
     * @since Introduced in 1.11.0. This change is not rollback-safe. However, due to an SDK bug, SDKs
     *        v1.11.0 and v1.11.1 were not properly writing back the flags to history, possibly resulting
     *        in NDE on replay. We therefore consider that a WFT emitted by Worker v1.11.0 or v1.11.1
     *        to implicitely have this flag on.
     */
    ProcessWorkflowActivationJobsAsSingleBatch: defineFlag(2, true, [buildIdSdkVersionMatches(/1\.11\.[01]/)]),
    /**
     * In 1.11.5 the `handleSignal` interceptor was added to @temporalio/interceptors-opentelemetry
     * which added a yield point. The added yield point can cause NDE if there was a signal handler and
     * the workflow was started with a signal.
     *
     * This yield point was removed in 1.13.2, but in order to prevent workflows from the
     * affected versions resulting in NDE, we have to inject the yield point on replay.
     * @since Introduced in 1.13.2.
     */
    OpenTelemetryInterceptorsTracesInboundSignals: defineFlag(3, true, [isAtLeast({ major: 1, minor: 11, patch: 5 })]),
    /**
     * In 1.11.6, the `scheduleLocalActivity` interceptor was added to
     * `@temporalio/interceptors-opentelemetry` which added a yield point to the
     * outbound interceptor. This yield point was removed in 1.13.2.
     *
     * @since Introduced in 1.13.2
     */
    OpenTelemetryInterceptorsTracesLocalActivities: defineFlag(4, true, [isAtLeast({ major: 1, minor: 11, patch: 6 })]),
    /**
     * The interceptors provided by @temporalio/interceptors-opentelemetry initially had unnecessary
     * yield points on calling to `extractContextFromHeaders`.
     * If replaying a workflow created from these versions a yield point is injected to prevent any NDE.
     *
     * If the history does not include the SDK version, default to extra yields since the yields were present since the OTEL
     * package was created.
     *
     * @since Introduced in 1.13.2
     */
    OpenTelemetryInterceporsAvoidsExtraYields: defineFlag(5, true, [isAtLeast({ major: 1, minor: 13, patch: 2 })]),
    /**
     * In 1.13.3, all remaining interceptor methods were implemented in @temporalio/interceptors-opentelemetry
     * including `handleUpdate`, `validateUpdate`, `handleQuery`, `startTimer`, and `startNexusOperation`.
     * These add instrumentation and yield points that were not present in earlier versions.
     * This flag gates these new interceptor methods to prevent NDE on replay of workflows from earlier versions.
     *
     * @since Introduced in 1.13.3
     */
    OpenTelemetryInterceptorsInstrumentsAllMethods: defineFlag(6, true),
};
function defineFlag(id, def, alternativeConditions) {
    const flag = { id, default: def, alternativeConditions };
    flagsRegistry.set(id, flag);
    return flag;
}
function assertValidFlag(id) {
    if (!flagsRegistry.has(id))
        throw new TypeError(`Unknown SDK flag: ${id}`);
}
function buildIdSdkVersionMatches(version) {
    const regex = new RegExp(`^@temporalio/worker@(${version.source})[+]`);
    return ({ info }) => info.currentBuildId != null && regex.test(info.currentBuildId);
}
/**
 * Creates an `AltConditionFn` that checks if the SDK version is equal to or after the provided version.
 * An optional default can be provided in case the SDK version is not available.
 */
function isAtLeast(compare, missingDefault) {
    return (ctx) => {
        return isCompared(compare, -1, missingDefault)(ctx) || isCompared(compare, 0, missingDefault)(ctx);
    };
}
function isCompared(compare, comparison, missingDefault = false) {
    return ({ sdkVersion }) => {
        if (!sdkVersion)
            return missingDefault;
        const version = parseSemver(sdkVersion);
        if (!version)
            return missingDefault;
        return compareSemver(compare, version) === comparison;
    };
}
function parseSemver(version) {
    try {
        const [_, major, minor, patch] = version.match(/(\d+)\.(\d+)\.(\d+)/);
        return {
            major: Number.parseInt(major),
            minor: Number.parseInt(minor),
            patch: Number.parseInt(patch),
        };
    }
    catch {
        return undefined;
    }
}
function compareSemver(a, b) {
    if (a.major < b.major)
        return -1;
    if (a.major > b.major)
        return +1;
    if (a.minor < b.minor)
        return -1;
    if (a.minor > b.minor)
        return +1;
    if (a.patch < b.patch)
        return -1;
    if (a.patch > b.patch)
        return +1;
    return 0;
}
//# sourceMappingURL=flags.js.map