"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Activity = void 0;
exports.activityLogAttributes = activityLogAttributes;
const activity_1 = require("@temporalio/activity");
const common_1 = require("@temporalio/common");
const internal_non_workflow_1 = require("@temporalio/common/lib/internal-non-workflow");
const interceptors_1 = require("@temporalio/common/lib/interceptors");
const type_helpers_1 = require("@temporalio/common/lib/type-helpers");
const logger_1 = require("@temporalio/common/lib/logger");
const metrics_1 = require("@temporalio/common/lib/metrics");
const UNINITIALIZED = Symbol('UNINITIALIZED');
class Activity {
    info;
    fn;
    dataConverter;
    serializationContext;
    outputTypeInfo;
    heartbeatCallback;
    _client;
    cancelReason;
    cancellationDetails;
    context;
    cancel = () => undefined;
    abortController = new AbortController();
    /**
     * Logger bound to `sdkComponent: worker`, with metadata from this activity.
     * This is the logger to use for all log messages emitted by the activity
     * worker. Note this is not exactly the same thing as the activity context
     * logger, which is bound to `sdkComponent: activity`.
     */
    workerLogger;
    /**
     * Metric Meter with tags from this activity, including tags from interceptors.
     */
    metricMeter;
    interceptors;
    constructor(info, fn, dataConverter, serializationContext, outputTypeInfo, heartbeatCallback, _client, // May be undefined in the case of MockActivityEnvironment
    workerLogger, workerMetricMeter, interceptors) {
        this.info = info;
        this.fn = fn;
        this.dataConverter = dataConverter;
        this.serializationContext = serializationContext;
        this.outputTypeInfo = outputTypeInfo;
        this.heartbeatCallback = heartbeatCallback;
        this._client = _client;
        this.workerLogger = logger_1.LoggerWithComposedMetadata.compose(workerLogger, this.getLogAttributes.bind(this));
        this.metricMeter = metrics_1.MetricMeterWithComposedTags.compose(workerMetricMeter, this.getMetricTags.bind(this));
        this.cancellationDetails = {};
        const promise = new Promise((_, reject) => {
            this.cancel = (reason, details) => {
                this.cancelReason = reason;
                this.cancellationDetails.details = details;
                const err = new common_1.CancelledFailure(reason);
                this.abortController.abort(err);
                reject(err);
            };
        });
        this.context = new activity_1.Context(info, promise, this.abortController.signal, this.heartbeatCallback, this._client, 
        // This is the activity context logger, to be used exclusively from user code
        logger_1.LoggerWithComposedMetadata.compose(this.workerLogger, { sdkComponent: common_1.SdkComponent.activity }), this.metricMeter, this.cancellationDetails);
        // Prevent unhandled rejection
        promise.catch(() => undefined);
        this.interceptors = { inbound: [], outbound: [] };
        interceptors
            .map((factory) => factory(this.context))
            .forEach(({ inbound, outbound }) => {
            if (inbound)
                this.interceptors.inbound.push(inbound);
            if (outbound)
                this.interceptors.outbound.push(outbound);
        });
    }
    getLogAttributes() {
        const logAttributes = activityLogAttributes(this.info);
        // In case some interceptor uses the logger while initializing...
        if (this.interceptors == null)
            return logAttributes;
        return (0, interceptors_1.composeInterceptors)(this.interceptors.outbound, 'getLogAttributes', (a) => a)(logAttributes);
    }
    getMetricTags() {
        const baseTags = {
            namespace: this.info.namespace,
            taskQueue: this.info.taskQueue,
            activityType: this.info.activityType,
        };
        // In case some interceptors use the metric meter while initializing...
        if (this.interceptors == null)
            return baseTags;
        return (0, interceptors_1.composeInterceptors)(this.interceptors.outbound, 'getMetricTags', (a) => a)(baseTags);
    }
    /**
     * Actually executes the function.
     *
     * Any call up to this function and including this one will be trimmed out of stack traces.
     */
    async execute(fn, input) {
        let error = UNINITIALIZED; // In case someone decides to throw undefined...
        const startTime = process.hrtime.bigint();
        this.workerLogger.debug('Activity started');
        try {
            const executeNextHandler = ({ args }) => fn(...args);
            const executeWithInterceptors = (0, interceptors_1.composeInterceptors)(this.interceptors.inbound, 'execute', executeNextHandler);
            return await executeWithInterceptors(input);
        }
        catch (err) {
            error = err;
            throw err;
        }
        finally {
            const durationNanos = process.hrtime.bigint() - startTime;
            const durationMs = Number(durationNanos / 1000000n);
            if (error === UNINITIALIZED) {
                this.workerLogger.debug('Activity completed', { durationMs });
            }
            else if ((error instanceof common_1.CancelledFailure || (0, type_helpers_1.isAbortError)(error)) &&
                this.context.cancellationSignal.aborted) {
                if (this.context.cancellationDetails?.cancelRequested) {
                    this.workerLogger.debug('Activity completed as cancelled', { durationMs });
                }
                else if (this.context.cancellationDetails?.reset) {
                    this.workerLogger.debug('Activity reset', { durationMs });
                }
                else if (this.context.cancellationDetails?.paused) {
                    this.workerLogger.debug('Activity paused', { durationMs });
                }
                else {
                    // Fallback log - completed as cancelled.
                    this.workerLogger.debug('Activity completed as cancelled', { durationMs });
                }
            }
            else if (error instanceof activity_1.CompleteAsyncError) {
                this.workerLogger.debug('Activity will complete asynchronously', { durationMs });
            }
            else {
                if (error instanceof common_1.ApplicationFailure && error.category === common_1.ApplicationFailureCategory.BENIGN) {
                    // Downgrade log level to DEBUG for benign application errors.
                    this.workerLogger.debug('Activity failed', { error, durationMs });
                }
                else {
                    this.workerLogger.warn('Activity failed', { error, durationMs });
                }
            }
        }
    }
    // Ensure that client calls made with the worker's client in this handler's context are tied
    // to the abort signal. The fact that client can be undefined (i.e. in a MockActivityEnvironment)
    // makes this a bit more complex.
    executeWithClient(fn, input) {
        if (this._client) {
            return this._client.withAbortSignal(this.abortController.signal, () => {
                return this.execute(fn, input);
            });
        }
        else {
            return this.execute(fn, input);
        }
    }
    run(input) {
        return activity_1.asyncLocalStorage.run(this.context, async () => {
            try {
                if (this.fn === undefined)
                    throw new common_1.IllegalStateError('Activity function is not defined');
                const result = await this.executeWithClient(this.fn, input);
                return {
                    completed: {
                        result: await (0, internal_non_workflow_1.encodeToPayload)(this.dataConverter, result, this.serializationContext, this.outputTypeInfo),
                    },
                };
            }
            catch (err) {
                if (err instanceof activity_1.CompleteAsyncError) {
                    return { willCompleteAsync: {} };
                }
                if (this.cancelReason === 'HEARTBEAT_DETAILS_CONVERSION_FAILED') {
                    // Ignore actual failure, it is likely a CancelledFailure but server
                    // expects activity to only fail with ApplicationFailure
                    return {
                        failed: {
                            failure: await (0, internal_non_workflow_1.encodeErrorToFailure)(this.dataConverter, common_1.ApplicationFailure.retryable(this.cancelReason, 'CancelledFailure'), this.serializationContext),
                        },
                    };
                }
                else if (this.cancelReason) {
                    // Either a CancelledFailure that we threw or AbortError from AbortController
                    if (err instanceof common_1.CancelledFailure) {
                        // If cancel due to activity pause or reset, emit an application failure.
                        if (this.context.cancellationDetails?.reset) {
                            return {
                                failed: {
                                    failure: await (0, internal_non_workflow_1.encodeErrorToFailure)(this.dataConverter, new common_1.ApplicationFailure('Activity reset', 'ActivityReset'), this.serializationContext),
                                },
                            };
                        }
                        else if (this.context.cancellationDetails?.paused) {
                            return {
                                failed: {
                                    failure: await (0, internal_non_workflow_1.encodeErrorToFailure)(this.dataConverter, new common_1.ApplicationFailure('Activity paused', 'ActivityPause'), this.serializationContext),
                                },
                            };
                        }
                        else {
                            const failure = await (0, internal_non_workflow_1.encodeErrorToFailure)(this.dataConverter, err, this.serializationContext);
                            failure.stackTrace = undefined;
                            return { cancelled: { failure } };
                        }
                    }
                    else if ((0, type_helpers_1.isAbortError)(err)) {
                        return { cancelled: { failure: { source: common_1.FAILURE_SOURCE, canceledFailureInfo: {} } } };
                    }
                }
                return {
                    failed: {
                        failure: await (0, internal_non_workflow_1.encodeErrorToFailure)(this.dataConverter, (0, common_1.ensureApplicationFailure)(err), this.serializationContext),
                    },
                };
            }
        });
    }
    runNoEncoding(fn, input) {
        if (this.fn !== undefined)
            throw new common_1.IllegalStateError('Activity function is defined');
        return activity_1.asyncLocalStorage.run(this.context, () => this.executeWithClient(fn, input));
    }
}
exports.Activity = Activity;
/**
 * Returns a map of attributes to be set on log messages for a given Activity
 */
function activityLogAttributes(info) {
    const attrs = {
        isLocal: info.isLocal,
        attempt: info.attempt,
        namespace: info.namespace,
        taskToken: info.base64TaskToken,
        activityId: info.activityId,
        activityType: info.activityType,
        taskQueue: info.taskQueue,
    };
    if (info.inWorkflow) {
        attrs.workflowId = info.workflowExecution.workflowId;
        attrs.workflowRunId = info.workflowExecution.runId;
        attrs.workflowType = info.workflowType;
    }
    else {
        attrs.activityRunId = info.activityRunId;
    }
    return attrs;
}
//# sourceMappingURL=activity.js.map