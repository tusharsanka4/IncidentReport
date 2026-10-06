"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultFailureConverter = void 0;
exports.cutoffStackTrace = cutoffStackTrace;
const nexus = __importStar(require("nexus-rpc"));
const long_1 = __importDefault(require("long"));
const failure_1 = require("../failure");
const internal_workflow_1 = require("../internal-workflow");
const type_helpers_1 = require("../type-helpers");
const time_1 = require("../time");
const encoding_1 = require("../encoding");
const payload_converter_1 = require("./payload-converter");
// Can't import proto enums into the workflow sandbox, use this helper type and enum converter instead.
const NexusHandlerErrorRetryBehavior = {
    RETRYABLE: 'RETRYABLE',
    NON_RETRYABLE: 'NON_RETRYABLE',
};
const [encodeNexusHandlerErrorRetryBehavior, decodeNexusHandlerErrorRetryBehavior] = (0, internal_workflow_1.makeProtoEnumConverters)({
    UNSPECIFIED: 0,
    [NexusHandlerErrorRetryBehavior.RETRYABLE]: 1,
    [NexusHandlerErrorRetryBehavior.NON_RETRYABLE]: 2,
}, 'NEXUS_HANDLER_ERROR_RETRY_BEHAVIOR_');
function combineRegExp(...regexps) {
    return new RegExp(regexps.map((x) => `(?:${x.source})`).join('|'));
}
/**
 * Stack traces will be cutoff when on of these patterns is matched
 */
const CUTOFF_STACK_PATTERNS = combineRegExp(
/** Activity execution */
/\s+at (Activity\.)?execute \(.*[\\/]worker[\\/](?:src|lib)[\\/]activity\.[jt]s:\d+:\d+\)/, 
/** Nexus execution */
/\s+at( async)? (NexusHandler\.)?invokeUserCode \(.*[\\/]worker[\\/](?:src|lib)[\\/]nexus[\\/]index\.[jt]s:\d+:\d+\)/, 
/** Workflow activation (inbound handlers only) */
/\s+at( async)? (Activator\.)?(startWorkflow|queryWorkflow|signalWorkflow|update|validateUpdate)NextHandler \(.*\.[jt]s:\d+:\d+\)/, 
/** Workflow run anything in context */
/\s+at (Script\.)?runInContext \(native|unknown|(?:(?:node:vm|vm\.js):\d+:\d+)\)/);
/**
 * Any stack trace frames that match any of those wil be dopped.
 * The "null." prefix on some cases is to avoid https://github.com/nodejs/node/issues/42417
 */
const DROPPED_STACK_FRAMES_PATTERNS = combineRegExp(
/** Internal functions used to recursively chain interceptors */
/\s+at (null\.)?next \(.*[\\/]common[\\/](?:src|lib)[\\/]interceptors\.[jt]s:\d+:\d+\)/, 
/** Internal functions used to recursively chain interceptors */
/\s+at (null\.)?executeNextHandler \(.*[\\/]worker[\\/](?:src|lib)[\\/]activity\.[jt]s:\d+:\d+\)/);
/**
 * Cuts out the framework part of a stack trace, leaving only user code entries
 */
function cutoffStackTrace(stack) {
    const lines = (stack ?? '').split(/\r?\n/);
    const acc = Array();
    for (const line of lines) {
        if (CUTOFF_STACK_PATTERNS.test(line))
            break;
        if (!DROPPED_STACK_FRAMES_PATTERNS.test(line))
            acc.push(line);
    }
    return acc.join('\n');
}
/**
 * Default, cross-language-compatible Failure converter.
 *
 * By default, it will leave error messages and stack traces as plain text. In order to encrypt them, set
 * `encodeCommonAttributes` to `true` in the constructor options and use a {@link PayloadCodec} that can encrypt /
 * decrypt Payloads in your {@link WorkerOptions.dataConverter | Worker} and
 * {@link ClientOptions.dataConverter | Client options}.
 */
class DefaultFailureConverter {
    options;
    constructor(options) {
        const { encodeCommonAttributes } = options ?? {};
        this.options = {
            encodeCommonAttributes: encodeCommonAttributes ?? false,
        };
    }
    /**
     * Converts a Failure proto message to a JS Error object.
     *
     * Does not set common properties, that is done in {@link failureToError}.
     */
    failureToErrorInner(failure, payloadConverter, context) {
        if (failure.applicationFailureInfo) {
            return new failure_1.ApplicationFailure(failure.message ?? undefined, failure.applicationFailureInfo.type, Boolean(failure.applicationFailureInfo.nonRetryable), (0, payload_converter_1.arrayFromPayloads)(payloadConverter, failure.applicationFailureInfo.details?.payloads, context), this.optionalFailureToOptionalError(failure.cause, payloadConverter, context), undefined, (0, failure_1.decodeApplicationFailureCategory)(failure.applicationFailureInfo.category));
        }
        if (failure.serverFailureInfo) {
            return new failure_1.ServerFailure(failure.message ?? undefined, Boolean(failure.serverFailureInfo.nonRetryable), this.optionalFailureToOptionalError(failure.cause, payloadConverter, context));
        }
        if (failure.timeoutFailureInfo) {
            return new failure_1.TimeoutFailure(failure.message ?? undefined, (0, payload_converter_1.fromPayloadsAtIndex)(payloadConverter, 0, failure.timeoutFailureInfo.lastHeartbeatDetails?.payloads, context), (0, failure_1.decodeTimeoutType)(failure.timeoutFailureInfo.timeoutType));
        }
        if (failure.terminatedFailureInfo) {
            return new failure_1.TerminatedFailure(failure.message ?? undefined, this.optionalFailureToOptionalError(failure.cause, payloadConverter, context));
        }
        if (failure.canceledFailureInfo) {
            return new failure_1.CancelledFailure(failure.message ?? undefined, (0, payload_converter_1.arrayFromPayloads)(payloadConverter, failure.canceledFailureInfo.details?.payloads, context), this.optionalFailureToOptionalError(failure.cause, payloadConverter, context));
        }
        if (failure.resetWorkflowFailureInfo) {
            return new failure_1.ApplicationFailure(failure.message ?? undefined, 'ResetWorkflow', false, (0, payload_converter_1.arrayFromPayloads)(payloadConverter, failure.resetWorkflowFailureInfo.lastHeartbeatDetails?.payloads, context), this.optionalFailureToOptionalError(failure.cause, payloadConverter, context));
        }
        if (failure.childWorkflowExecutionFailureInfo) {
            const { namespace, workflowType, workflowExecution, retryState } = failure.childWorkflowExecutionFailureInfo;
            if (!(workflowType?.name && workflowExecution)) {
                throw new TypeError('Missing attributes on childWorkflowExecutionFailureInfo');
            }
            return new failure_1.ChildWorkflowFailure(namespace ?? undefined, workflowExecution, workflowType.name, (0, failure_1.decodeRetryState)(retryState), this.optionalFailureToOptionalError(failure.cause, payloadConverter, context));
        }
        if (failure.activityFailureInfo) {
            if (!failure.activityFailureInfo.activityType?.name) {
                throw new TypeError('Missing activityType?.name on activityFailureInfo');
            }
            return new failure_1.ActivityFailure(failure.message ?? undefined, failure.activityFailureInfo.activityType.name, failure.activityFailureInfo.activityId ?? undefined, (0, failure_1.decodeRetryState)(failure.activityFailureInfo.retryState), failure.activityFailureInfo.identity ?? undefined, this.optionalFailureToOptionalError(failure.cause, payloadConverter, context));
        }
        if (failure.nexusHandlerFailureInfo) {
            let retryableOverride = undefined;
            const retryBehavior = decodeNexusHandlerErrorRetryBehavior(failure.nexusHandlerFailureInfo.retryBehavior);
            switch (retryBehavior) {
                case 'RETRYABLE':
                    retryableOverride = true;
                    break;
                case 'NON_RETRYABLE':
                    retryableOverride = false;
                    break;
            }
            const rawErrorType = failure.nexusHandlerFailureInfo.type || '';
            const resolvedType = Object.hasOwn(nexus.HandlerErrorType, rawErrorType)
                ? nexus.HandlerErrorType[rawErrorType]
                : 'UNKNOWN';
            return new nexus.HandlerError(resolvedType, failure.message ?? 'Nexus handler error', {
                cause: this.optionalFailureToOptionalError(failure.cause, payloadConverter, context),
                retryableOverride,
                rawErrorType,
                originalFailure: this.temporalFailureToNexusFailure(failure),
            });
        }
        if (failure.nexusOperationExecutionFailureInfo) {
            return new failure_1.NexusOperationFailure(
            // TODO(nexus/error): Maybe set a default message here, once we've decided on error handling.
            failure.message ?? undefined, failure.nexusOperationExecutionFailureInfo.scheduledEventId?.toNumber(), 
            // We assume these will always be set or gracefully set to empty strings.
            failure.nexusOperationExecutionFailureInfo.endpoint ?? '', failure.nexusOperationExecutionFailureInfo.service ?? '', failure.nexusOperationExecutionFailureInfo.operation ?? '', failure.nexusOperationExecutionFailureInfo.operationToken ?? undefined, this.optionalFailureToOptionalError(failure.cause, payloadConverter, context));
        }
        return new failure_1.TemporalFailure(failure.message ?? undefined, this.optionalFailureToOptionalError(failure.cause, payloadConverter, context));
    }
    failureToError(failure, payloadConverter, context) {
        if (failure.encodedAttributes) {
            const attrs = payloadConverter.fromPayload(failure.encodedAttributes, context);
            // Don't apply encodedAttributes unless they conform to an expected schema
            if (typeof attrs === 'object' && attrs !== null) {
                const { message, stack_trace } = attrs;
                // Avoid mutating the argument
                failure = { ...failure };
                if (typeof message === 'string') {
                    failure.message = message;
                }
                if (typeof stack_trace === 'string') {
                    failure.stackTrace = stack_trace;
                }
            }
        }
        const err = this.failureToErrorInner(failure, payloadConverter, context);
        err.stack = failure.stackTrace ?? '';
        if (err instanceof failure_1.TemporalFailure) {
            err.failure = failure;
        }
        return err;
    }
    errorToFailure(err, payloadConverter, context) {
        const failure = this.errorToFailureInner(err, payloadConverter, context);
        if (this.options.encodeCommonAttributes) {
            const { message, stackTrace } = failure;
            failure.message = 'Encoded failure';
            failure.stackTrace = '';
            failure.encodedAttributes = payloadConverter.toPayload({ message, stack_trace: stackTrace }, context);
        }
        return failure;
    }
    errorToFailureInner(err, payloadConverter, context) {
        if (err instanceof failure_1.TemporalFailure || err instanceof nexus.HandlerError) {
            if (err instanceof failure_1.TemporalFailure && err.failure)
                return err.failure;
            const base = {
                message: err.message,
                stackTrace: cutoffStackTrace(err.stack),
                cause: this.optionalErrorToOptionalFailure(err.cause, payloadConverter, context),
                source: failure_1.FAILURE_SOURCE,
            };
            if (err instanceof failure_1.ActivityFailure) {
                return {
                    ...base,
                    activityFailureInfo: {
                        ...err,
                        retryState: (0, failure_1.encodeRetryState)(err.retryState),
                        activityType: { name: err.activityType },
                    },
                };
            }
            if (err instanceof failure_1.ChildWorkflowFailure) {
                return {
                    ...base,
                    childWorkflowExecutionFailureInfo: {
                        ...err,
                        retryState: (0, failure_1.encodeRetryState)(err.retryState),
                        workflowExecution: err.execution,
                        workflowType: { name: err.workflowType },
                    },
                };
            }
            if (err instanceof failure_1.ApplicationFailure) {
                return {
                    ...base,
                    applicationFailureInfo: {
                        type: err.type,
                        nonRetryable: err.nonRetryable,
                        details: err.details && err.details.length
                            ? { payloads: (0, payload_converter_1.toPayloadsWithContext)(payloadConverter, context, err.details) }
                            : undefined,
                        nextRetryDelay: (0, time_1.msOptionalToTs)(err.nextRetryDelay),
                        category: (0, failure_1.encodeApplicationFailureCategory)(err.category),
                    },
                };
            }
            if (err instanceof failure_1.CancelledFailure) {
                return {
                    ...base,
                    canceledFailureInfo: {
                        details: err.details && err.details.length
                            ? { payloads: (0, payload_converter_1.toPayloadsWithContext)(payloadConverter, context, err.details) }
                            : undefined,
                    },
                };
            }
            if (err instanceof failure_1.TimeoutFailure) {
                return {
                    ...base,
                    timeoutFailureInfo: {
                        timeoutType: (0, failure_1.encodeTimeoutType)(err.timeoutType),
                        lastHeartbeatDetails: err.lastHeartbeatDetails
                            ? { payloads: (0, payload_converter_1.toPayloadsWithContext)(payloadConverter, context, [err.lastHeartbeatDetails]) }
                            : undefined,
                    },
                };
            }
            if (err instanceof failure_1.ServerFailure) {
                return {
                    ...base,
                    serverFailureInfo: { nonRetryable: err.nonRetryable },
                };
            }
            if (err instanceof failure_1.TerminatedFailure) {
                return {
                    ...base,
                    terminatedFailureInfo: {},
                };
            }
            if (err instanceof nexus.HandlerError) {
                if (err.originalFailure) {
                    return this.nexusFailureToTemporalFailure(err.originalFailure, err.retryable);
                }
                else {
                    let retryBehavior = undefined;
                    switch (err.retryableOverride) {
                        case true:
                            retryBehavior = encodeNexusHandlerErrorRetryBehavior('RETRYABLE');
                            break;
                        case false:
                            retryBehavior = encodeNexusHandlerErrorRetryBehavior('NON_RETRYABLE');
                            break;
                    }
                    return {
                        ...base,
                        nexusHandlerFailureInfo: {
                            type: err.type,
                            retryBehavior,
                        },
                    };
                }
            }
            if (err instanceof failure_1.NexusOperationFailure) {
                return {
                    ...base,
                    nexusOperationExecutionFailureInfo: {
                        scheduledEventId: err.scheduledEventId ? long_1.default.fromNumber(err.scheduledEventId) : undefined,
                        endpoint: err.endpoint,
                        service: err.service,
                        operation: err.operation,
                        operationToken: err.operationToken,
                    },
                };
            }
            // Just a TemporalFailure
            return base;
        }
        const base = {
            source: failure_1.FAILURE_SOURCE,
        };
        if ((0, type_helpers_1.isError)(err)) {
            return {
                ...base,
                message: String(err.message ?? ''),
                stackTrace: cutoffStackTrace(err.stack),
                cause: this.optionalErrorToOptionalFailure(err.cause, payloadConverter, context),
            };
        }
        const recommendation = ` [A non-Error value was thrown from your code. We recommend throwing Error objects so that we can provide a stack trace]`;
        if (typeof err === 'string') {
            return { ...base, message: err + recommendation };
        }
        if (typeof err === 'object') {
            let message = '';
            try {
                message = JSON.stringify(err);
            }
            catch (_err) {
                message = String(err);
            }
            return { ...base, message: message + recommendation };
        }
        return { ...base, message: String(err) + recommendation };
    }
    /**
     * Converts a Failure proto message to a JS Error object if defined or returns undefined.
     */
    optionalFailureToOptionalError(failure, payloadConverter, context) {
        return failure ? this.failureToError(failure, payloadConverter, context) : undefined;
    }
    /**
     * Converts an error to a Failure proto message if defined or returns undefined
     */
    optionalErrorToOptionalFailure(err, payloadConverter, context) {
        return err ? this.errorToFailure(err, payloadConverter, context) : undefined;
    }
    nexusFailureToTemporalFailure(failure, retryable) {
        if (failure.metadata?.type === 'temporal.api.failure.v1.Failure') {
            if (failure.details == null) {
                throw new TypeError("missing details for Nexus Failure of type 'temporal.api.failure.v1.Failure'");
            }
            return failure.details;
        }
        else {
            const temporalFailure = {};
            temporalFailure.applicationFailureInfo = {
                type: 'NexusFailure',
                nonRetryable: !retryable,
                details: {
                    payloads: [
                        {
                            metadata: { encoding: (0, encoding_1.encode)('json/plain') },
                            data: (0, encoding_1.encode)(JSON.stringify({ ...failure, message: '' })),
                        },
                    ],
                },
            };
            temporalFailure.message = failure.message;
            temporalFailure.stackTrace = failure.stackTrace ?? '';
            return temporalFailure;
        }
    }
    temporalFailureToNexusFailure(failure) {
        return {
            message: failure.message ?? '',
            metadata: { type: 'temporal.api.failure.v1.Failure' },
            // Store the full ProtoFailure as the Nexus failure details so it can be round-tripped
            // losslessly back to a ProtoFailure via nexusFailureToTemporalFailure.
            details: { ...failure },
        };
    }
}
exports.DefaultFailureConverter = DefaultFailureConverter;
//# sourceMappingURL=failure-converter.js.map