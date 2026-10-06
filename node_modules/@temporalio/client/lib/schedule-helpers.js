"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeOptionalStructuredCalendarSpecs = encodeOptionalStructuredCalendarSpecs;
exports.decodeOptionalStructuredCalendarSpecs = decodeOptionalStructuredCalendarSpecs;
exports.compileScheduleOptions = compileScheduleOptions;
exports.compileUpdatedScheduleOptions = compileUpdatedScheduleOptions;
exports.encodeScheduleSpec = encodeScheduleSpec;
exports.encodeScheduleAction = encodeScheduleAction;
exports.encodeSchedulePolicies = encodeSchedulePolicies;
exports.encodeScheduleState = encodeScheduleState;
exports.decodeScheduleSpec = decodeScheduleSpec;
exports.decodeScheduleAction = decodeScheduleAction;
exports.decodeScheduleRunningActions = decodeScheduleRunningActions;
exports.decodeScheduleRecentActions = decodeScheduleRecentActions;
const long_1 = __importDefault(require("long"));
const common_1 = require("@temporalio/common");
const codec_helpers_1 = require("@temporalio/common/lib/internal-non-workflow/codec-helpers");
const payload_search_attributes_1 = require("@temporalio/common/lib/converter/payload-search-attributes");
const internal_non_workflow_1 = require("@temporalio/common/lib/internal-non-workflow");
const proto_1 = require("@temporalio/proto");
const time_1 = require("@temporalio/common/lib/time");
const schedule_types_1 = require("./schedule-types");
const [encodeSecond, decodeSecond] = makeCalendarSpecFieldCoders('second', (x) => (typeof x === 'number' && x >= 0 && x <= 59 ? x : undefined), (x) => x, [{ start: 0, end: 0, step: 0 }], // default to 0
[{ start: 0, end: 59, step: 1 }]);
const [encodeMinute, decodeMinue] = makeCalendarSpecFieldCoders('minute', (x) => (typeof x === 'number' && x >= 0 && x <= 59 ? x : undefined), (x) => x, [{ start: 0, end: 0, step: 0 }], // default to 0
[{ start: 0, end: 59, step: 1 }]);
const [encodeHour, decodeHour] = makeCalendarSpecFieldCoders('hour', (x) => (typeof x === 'number' && x >= 0 && x <= 23 ? x : undefined), (x) => x, [{ start: 0, end: 0, step: 0 }], // default to 0
[{ start: 0, end: 23, step: 1 }]);
const [encodeDayOfMonth, decodeDayOfMonth] = makeCalendarSpecFieldCoders('dayOfMonth', (x) => (typeof x === 'number' && x >= 0 && x <= 31 ? x : undefined), (x) => x, [{ start: 1, end: 31, step: 1 }], // default to *
[{ start: 1, end: 31, step: 1 }]);
const [encodeMonth, decodeMonth] = makeCalendarSpecFieldCoders('month', function monthNameToNumber(month) {
    const index = schedule_types_1.MONTHS.indexOf(month);
    return index >= 0 ? index + 1 : undefined;
}, (month) => schedule_types_1.MONTHS[month - 1], [{ start: 1, end: 12, step: 1 }], // default to *
[{ start: 1, end: 12, step: 1 }]);
const [encodeYear, decodeYear] = makeCalendarSpecFieldCoders('year', (x) => (typeof x === 'number' ? x : undefined), (x) => x, [], // default to *
[] // special case: * for years is encoded as no range at all
);
const [encodeDayOfWeek, decodeDayOfWeek] = makeCalendarSpecFieldCoders('dayOfWeek', function dayOfWeekNameToNumber(day) {
    const index = schedule_types_1.DAYS_OF_WEEK.indexOf(day);
    return index >= 0 ? index : undefined;
}, (day) => schedule_types_1.DAYS_OF_WEEK[day], [{ start: 0, end: 6, step: 1 }], // default to *
[{ start: 0, end: 6, step: 1 }]);
function makeCalendarSpecFieldCoders(fieldName, encodeValueFn, decodeValueFn, defaultValue, matchAllValue) {
    function encoder(input) {
        if (input === undefined)
            return defaultValue;
        if (input === '*')
            return matchAllValue;
        return (Array.isArray(input) ? input : [input]).map((item) => {
            if (typeof item === 'object' && item.start !== undefined) {
                const range = item;
                const start = encodeValueFn(range.start);
                if (start !== undefined) {
                    return {
                        start,
                        end: range.end !== undefined ? encodeValueFn(range.end) ?? start : 1,
                        step: typeof range.step === 'number' && range.step > 0 ? range.step : 1,
                    };
                }
            }
            if (item !== undefined) {
                const value = encodeValueFn(item);
                if (value !== undefined)
                    return { start: value, end: value, step: 1 };
            }
            throw new TypeError(`Invalid CalendarSpec component for field ${fieldName}: '${item}' of type '${typeof item}'`);
        });
    }
    function decoder(input) {
        if (!input)
            return [];
        return input.map((pb) => {
            const start = decodeValueFn(pb.start);
            if (start === undefined) {
                throw new RangeError(`Invalid CalendarSpec component for field ${fieldName}: ${pb.start} is out of bounds`);
            }
            const end = pb.end > pb.start ? decodeValueFn(pb.end) ?? start : start;
            const step = pb.step > 0 ? pb.step : 1;
            return { start, end, step };
        });
    }
    return [encoder, decoder];
}
function encodeOptionalStructuredCalendarSpecs(input) {
    if (!input)
        return undefined;
    return input.map((spec) => ({
        second: encodeSecond(spec.second),
        minute: encodeMinute(spec.minute),
        hour: encodeHour(spec.hour),
        dayOfMonth: encodeDayOfMonth(spec.dayOfMonth),
        month: encodeMonth(spec.month),
        year: encodeYear(spec.year),
        dayOfWeek: encodeDayOfWeek(spec.dayOfWeek),
        comment: spec.comment,
    }));
}
function decodeOptionalStructuredCalendarSpecs(input) {
    if (!input)
        return [];
    return input.map((pb) => ({
        second: decodeSecond(pb.second),
        minute: decodeMinue(pb.minute),
        hour: decodeHour(pb.hour),
        dayOfMonth: decodeDayOfMonth(pb.dayOfMonth),
        month: decodeMonth(pb.month),
        year: decodeYear(pb.year),
        dayOfWeek: decodeDayOfWeek(pb.dayOfWeek),
        comment: pb.comment,
    }));
}
function compileScheduleOptions(options) {
    const workflowType = (0, common_1.extractWorkflowType)(options.action.workflowType);
    return {
        ...options,
        action: {
            ...options.action,
            workflowId: options.action.workflowId ?? `${options.scheduleId}-workflow`,
            workflowType,
            args: (options.action.args ?? []),
        },
    };
}
function compileUpdatedScheduleOptions(scheduleId, options) {
    const workflowTypeOrFunc = options.action.workflowType;
    const workflowType = (0, common_1.extractWorkflowType)(workflowTypeOrFunc);
    return {
        ...options,
        action: {
            ...options.action,
            workflowId: options.action.workflowId ?? `${scheduleId}-workflow`,
            workflowType,
            args: (options.action.args ?? []),
        },
    };
}
function encodeScheduleSpec(spec) {
    return {
        structuredCalendar: encodeOptionalStructuredCalendarSpecs(spec.calendars),
        interval: spec.intervals?.map((interval) => ({
            interval: (0, time_1.msToTs)(interval.every),
            phase: (0, time_1.msOptionalToTs)(interval.offset),
        })),
        cronString: spec.cronExpressions,
        excludeStructuredCalendar: encodeOptionalStructuredCalendarSpecs(spec.skip),
        startTime: (0, time_1.optionalDateToTs)(spec.startAt),
        endTime: (0, time_1.optionalDateToTs)(spec.endAt),
        jitter: (0, time_1.msOptionalToTs)(spec.jitter),
        timezoneName: spec.timezone,
    };
}
function workflowSerializationContext(namespace, workflowId) {
    return {
        type: 'workflow',
        namespace,
        workflowId,
    };
}
async function encodeScheduleAction(dataConverter, namespace, action, headers) {
    const context = workflowSerializationContext(namespace, action.workflowId);
    return {
        startWorkflow: {
            workflowId: action.workflowId,
            workflowType: {
                name: action.workflowType,
            },
            input: { payloads: await (0, internal_non_workflow_1.encodeToPayloadsWithContext)(dataConverter, context, action.args) },
            taskQueue: {
                kind: proto_1.temporal.api.enums.v1.TaskQueueKind.TASK_QUEUE_KIND_NORMAL,
                name: action.taskQueue,
            },
            workflowExecutionTimeout: (0, time_1.msOptionalToTs)(action.workflowExecutionTimeout),
            workflowRunTimeout: (0, time_1.msOptionalToTs)(action.workflowRunTimeout),
            workflowTaskTimeout: (0, time_1.msOptionalToTs)(action.workflowTaskTimeout),
            retryPolicy: action.retry ? (0, common_1.compileRetryPolicy)(action.retry) : undefined,
            memo: action.memo ? { fields: await (0, internal_non_workflow_1.encodeMapToPayloads)(dataConverter, action.memo, context) } : undefined,
            searchAttributes: action.searchAttributes || action.typedSearchAttributes
                ? {
                    indexedFields: (0, payload_search_attributes_1.encodeUnifiedSearchAttributes)(action.searchAttributes, action.typedSearchAttributes),
                }
                : undefined,
            header: { fields: headers },
            userMetadata: await (0, codec_helpers_1.encodeUserMetadata)(dataConverter, action.staticSummary, action.staticDetails, context),
            priority: action.priority ? (0, common_1.compilePriority)(action.priority) : undefined,
        },
    };
}
function encodeSchedulePolicies(policies) {
    return {
        catchupWindow: (0, time_1.msOptionalToTs)(policies?.catchupWindow),
        overlapPolicy: policies?.overlap ? (0, schedule_types_1.encodeScheduleOverlapPolicy)(policies.overlap) : undefined,
        pauseOnFailure: policies?.pauseOnFailure,
    };
}
function encodeScheduleState(state) {
    return {
        paused: state?.paused,
        notes: state?.note,
        limitedActions: state?.remainingActions !== undefined,
        remainingActions: state?.remainingActions ? long_1.default.fromNumber(state?.remainingActions) : undefined,
    };
}
function decodeScheduleSpec(pb) {
    // Note: the server will have compiled calendar and cron_string fields into
    // structured_calendar (and maybe interval and timezone_name), so at this
    // point, we'll see only structured_calendar, interval, etc.
    return {
        calendars: decodeOptionalStructuredCalendarSpecs(pb.structuredCalendar),
        intervals: (pb.interval ?? []).map((x) => ({
            every: (0, time_1.optionalTsToMs)(x.interval),
            offset: (0, time_1.optionalTsToMs)(x.phase),
        })),
        skip: decodeOptionalStructuredCalendarSpecs(pb.excludeStructuredCalendar),
        startAt: (0, time_1.optionalTsToDate)(pb.startTime),
        endAt: (0, time_1.optionalTsToDate)(pb.endTime),
        jitter: (0, time_1.optionalTsToMs)(pb.jitter),
        timezone: pb.timezoneName ?? undefined,
    };
}
async function decodeScheduleAction(dataConverter, namespace, pb) {
    if (pb.startWorkflow) {
        const context = workflowSerializationContext(namespace, pb.startWorkflow.workflowId);
        const { staticSummary, staticDetails } = await (0, codec_helpers_1.decodeUserMetadata)(dataConverter, pb.startWorkflow?.userMetadata, context);
        return {
            type: 'startWorkflow',
            workflowId: pb.startWorkflow.workflowId,
            workflowType: pb.startWorkflow.workflowType.name,
            taskQueue: pb.startWorkflow.taskQueue.name,
            args: await (0, internal_non_workflow_1.decodeArrayFromPayloads)(dataConverter, pb.startWorkflow.input?.payloads, context),
            memo: await (0, internal_non_workflow_1.decodeMapFromPayloads)(dataConverter, pb.startWorkflow.memo?.fields, context),
            retry: (0, common_1.decompileRetryPolicy)(pb.startWorkflow.retryPolicy),
            searchAttributes: (0, payload_search_attributes_1.decodeSearchAttributes)(pb.startWorkflow.searchAttributes?.indexedFields),
            typedSearchAttributes: (0, payload_search_attributes_1.decodeTypedSearchAttributes)(pb.startWorkflow.searchAttributes?.indexedFields),
            workflowExecutionTimeout: (0, time_1.optionalTsToMs)(pb.startWorkflow.workflowExecutionTimeout),
            workflowRunTimeout: (0, time_1.optionalTsToMs)(pb.startWorkflow.workflowRunTimeout),
            workflowTaskTimeout: (0, time_1.optionalTsToMs)(pb.startWorkflow.workflowTaskTimeout),
            staticSummary,
            staticDetails,
            priority: (0, common_1.decodePriority)(pb.startWorkflow.priority),
        };
    }
    throw new TypeError('Unsupported schedule action');
}
function decodeScheduleRunningActions(pb) {
    if (!pb)
        return [];
    return pb.map((x) => ({
        type: 'startWorkflow',
        workflow: {
            workflowId: x.workflowId,
            firstExecutionRunId: x.runId,
        },
    }));
}
function decodeScheduleRecentActions(pb) {
    if (!pb)
        return [];
    return pb.map((executionResult) => {
        let action;
        if (executionResult.startWorkflowResult) {
            action = {
                type: 'startWorkflow',
                workflow: {
                    workflowId: executionResult.startWorkflowResult.workflowId,
                    firstExecutionRunId: executionResult.startWorkflowResult.runId,
                },
            };
        }
        else
            throw new TypeError('Unsupported schedule action');
        return {
            scheduledAt: (0, time_1.requiredTsToDate)(executionResult.scheduleTime, 'scheduleTime'),
            takenAt: (0, time_1.requiredTsToDate)(executionResult.actualTime, 'actualTime'),
            action,
        };
    });
}
//# sourceMappingURL=schedule-helpers.js.map