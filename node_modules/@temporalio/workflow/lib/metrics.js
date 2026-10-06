"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricMeter = void 0;
const common_1 = require("@temporalio/common");
const interceptor_composition_1 = require("./interceptor-composition");
const sinks_1 = require("./sinks");
const workflow_1 = require("./workflow");
const global_attributes_1 = require("./global-attributes");
class WorkflowMetricMeterImpl {
    constructor() { }
    createCounter(name, unit, description) {
        (0, global_attributes_1.assertInWorkflowContext)("Workflow's `metricMeter` can only be used while in Workflow Context");
        return new WorkflowMetricCounter(name, unit, description);
    }
    createHistogram(name, valueType = 'int', unit, description) {
        (0, global_attributes_1.assertInWorkflowContext)("Workflow's `metricMeter` can only be used while in Workflow Context");
        return new WorkflowMetricHistogram(name, valueType, unit, description);
    }
    createGauge(name, valueType = 'int', unit, description) {
        (0, global_attributes_1.assertInWorkflowContext)("Workflow's `metricMeter` can only be used while in Workflow Context");
        return new WorkflowMetricGauge(name, valueType, unit, description);
    }
    withTags(_tags) {
        (0, global_attributes_1.assertInWorkflowContext)("Workflow's `metricMeter` can only be used while in Workflow Context");
        // Tags composition is handled by a MetricMeterWithComposedTags wrapper over this one
        throw new Error(`withTags is not supported directly on WorkflowMetricMeter`);
    }
}
class WorkflowMetricCounter {
    name;
    unit;
    description;
    kind = 'counter';
    valueType = 'int';
    constructor(name, unit, description) {
        this.name = name;
        this.unit = unit;
        this.description = description;
    }
    add(value, extraTags = {}) {
        if (value < 0) {
            throw new Error(`MetricCounter value must be non-negative (got ${value})`);
        }
        if (!(0, workflow_1.workflowInfo)().unsafe.isReplaying) {
            metricSink.addMetricCounterValue(this.name, this.unit, this.description, value, extraTags);
        }
    }
    withTags(_tags) {
        // Tags composition is handled by a MetricMeterWithComposedTags wrapper over this one
        throw new Error(`withTags is not supported directly on WorkflowMetricCounter`);
    }
}
class WorkflowMetricHistogram {
    name;
    valueType;
    unit;
    description;
    kind = 'histogram';
    constructor(name, valueType, unit, description) {
        this.name = name;
        this.valueType = valueType;
        this.unit = unit;
        this.description = description;
    }
    record(value, extraTags = {}) {
        if (value < 0) {
            throw new Error(`MetricHistogram value must be non-negative (got ${value})`);
        }
        if (!(0, workflow_1.workflowInfo)().unsafe.isReplaying) {
            metricSink.recordMetricHistogramValue(this.name, this.valueType, this.unit, this.description, value, extraTags);
        }
    }
    withTags(_tags) {
        // Tags composition is handled by a MetricMeterWithComposedTags wrapper over this one
        throw new Error(`withTags is not supported directly on WorkflowMetricHistogram`);
    }
}
class WorkflowMetricGauge {
    name;
    valueType;
    unit;
    description;
    kind = 'gauge';
    constructor(name, valueType, unit, description) {
        this.name = name;
        this.valueType = valueType;
        this.unit = unit;
        this.description = description;
    }
    set(value, tags) {
        if (value < 0) {
            throw new Error(`MetricGauge value must be non-negative (got ${value})`);
        }
        if (!(0, workflow_1.workflowInfo)().unsafe.isReplaying) {
            metricSink.setMetricGaugeValue(this.name, this.valueType, this.unit, this.description, value, tags ?? {});
        }
    }
    withTags(_tags) {
        // Tags composition is handled by a MetricMeterWithComposedTags wrapper over this one
        throw new Error(`withTags is not supported directly on WorkflowMetricGauge`);
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////
// Note: given that forwarding metrics outside of the sanbox can be quite chatty and add non
// negligeable overhead, we eagerly check for `isReplaying` and completely skip doing sink
// calls if we are replaying.
const metricSink = (0, sinks_1.proxySinks)().__temporal_metrics;
/**
 * A MetricMeter that can be used to emit metrics from within a Workflow.
 *
 * @experimental The Metric API is an experimental feature and may be subject to change.
 */
exports.metricMeter = common_1.MetricMeterWithComposedTags.compose(new WorkflowMetricMeterImpl(), () => {
    const activator = (0, global_attributes_1.assertInWorkflowContext)('Workflow.metricMeter may only be used from workflow context.');
    const getMetricTags = (0, interceptor_composition_1.composeInterceptors)(activator.interceptors.outbound, 'getMetricTags', (a) => a);
    const info = activator.info;
    return getMetricTags({
        // namespace and taskQueue will be added by the Worker
        workflowType: info.workflowType,
    });
}, true);
//# sourceMappingURL=metrics.js.map