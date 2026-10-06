"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsBuffer = exports.RuntimeMetricMeter = void 0;
const common_1 = require("@temporalio/common");
const core_bridge_1 = require("@temporalio/core-bridge");
////////////////////////////////////////////////////////////////////////////////////////////////////
// Metric Meter (aka Custom Metrics)
////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * An implementation of the {@link MetricMeter} interface that pushes emitted metrics through
 * the bridge, to be collected by whatever exporter is configured on the Core Runtime.
 *
 * @internal
 */
class RuntimeMetricMeter {
    runtime;
    constructor(runtime) {
        this.runtime = runtime;
    }
    createCounter(name, unit = '', description = '') {
        const nativeMetric = core_bridge_1.native.newMetricCounter(this.runtime, name, unit, description);
        return new RuntimeMetricCounter(nativeMetric, name, unit, description);
    }
    createHistogram(name, valueType = 'int', unit = '', description = '') {
        switch (valueType) {
            case 'int': {
                const nativeMetric = core_bridge_1.native.newMetricHistogram(this.runtime, name, unit, description);
                return new RuntimeMetricHistogram(nativeMetric, name, unit, description);
            }
            case 'float': {
                const nativeMetric = core_bridge_1.native.newMetricHistogramF64(this.runtime, name, unit, description);
                return new RuntimeMetricHistogramF64(nativeMetric, name, unit, description);
            }
        }
    }
    createGauge(name, valueType = 'int', unit = '', description = '') {
        switch (valueType) {
            case 'int': {
                const nativeMetric = core_bridge_1.native.newMetricGauge(this.runtime, name, unit, description);
                return new RuntimeMetricGauge(nativeMetric, name, unit, description);
            }
            case 'float': {
                const nativeMetric = core_bridge_1.native.newMetricGaugeF64(this.runtime, name, unit, description);
                return new RuntimeMetricGaugeF64(nativeMetric, name, unit, description);
            }
        }
    }
    createUpDownCounter(name, unit = '', description = '') {
        const nativeMetric = core_bridge_1.native.newMetricUpDownCounter(this.runtime, name, unit, description);
        return new RuntimeMetricUpDownCounter(nativeMetric, name, unit, description);
    }
    withTags(_extraTags) {
        // Tags composition is handled by a MetricMeterWithComposedTags wrapper over this one
        throw new Error('withTags is not supported directly on RuntimeMetricMeter');
    }
}
exports.RuntimeMetricMeter = RuntimeMetricMeter;
class RuntimeMetricCounter {
    native;
    name;
    unit;
    description;
    kind = 'counter';
    valueType = 'int';
    constructor(native, name, unit, description) {
        this.native = native;
        this.name = name;
        this.unit = unit;
        this.description = description;
    }
    add(value, tags = {}) {
        if (value < 0) {
            throw new Error(`MetricCounter value must be non-negative (got ${value})`);
        }
        core_bridge_1.native.addMetricCounterValue(this.native, value, JSON.stringify(tags));
    }
    withTags(_tags) {
        // Tags composition is handled by a MetricMeterWithComposedTags wrapper over this one
        throw new Error('withTags is not supported directly on RuntimeMetricCounter');
    }
}
class RuntimeMetricUpDownCounter {
    native;
    name;
    unit;
    description;
    kind = 'up-down-counter';
    valueType = 'int';
    constructor(native, name, unit, description) {
        this.native = native;
        this.name = name;
        this.unit = unit;
        this.description = description;
    }
    add(value, tags = {}) {
        core_bridge_1.native.addMetricUpDownCounterValue(this.native, value, JSON.stringify(tags));
    }
    withTags(_tags) {
        // Tags composition is handled by a MetricMeterWithComposedTags wrapper over this one
        throw new Error('withTags is not supported directly on RuntimeMetricUpDownCounter');
    }
}
class RuntimeMetricHistogram {
    native;
    name;
    unit;
    description;
    kind = 'histogram';
    valueType = 'int';
    constructor(native, name, unit, description) {
        this.native = native;
        this.name = name;
        this.unit = unit;
        this.description = description;
    }
    record(value, tags = {}) {
        if (value < 0) {
            throw new Error(`MetricHistogram value must be non-negative (got ${value})`);
        }
        core_bridge_1.native.recordMetricHistogramValue(this.native, value, JSON.stringify(tags));
    }
    withTags(_tags) {
        // Tags composition is handled by a MetricMeterWithComposedTags wrapper over this one
        throw new Error('withTags is not supported directly on RuntimeMetricHistogram');
    }
}
class RuntimeMetricHistogramF64 {
    native;
    name;
    unit;
    description;
    kind = 'histogram';
    valueType = 'float';
    constructor(native, name, unit, description) {
        this.native = native;
        this.name = name;
        this.unit = unit;
        this.description = description;
    }
    record(value, tags = {}) {
        if (value < 0) {
            throw new Error(`MetricHistogram value must be non-negative (got ${value})`);
        }
        core_bridge_1.native.recordMetricHistogramF64Value(this.native, value, JSON.stringify(tags));
    }
    withTags(_tags) {
        // Tags composition is handled by a MetricMeterWithComposedTags wrapper over this one
        throw new Error('withTags is not supported directly on RuntimeMetricHistogramF64');
    }
}
class RuntimeMetricGauge {
    native;
    name;
    unit;
    description;
    kind = 'gauge';
    valueType = 'int';
    constructor(native, name, unit, description) {
        this.native = native;
        this.name = name;
        this.unit = unit;
        this.description = description;
    }
    set(value, tags = {}) {
        if (value < 0) {
            throw new Error(`MetricGauge value must be non-negative (got ${value})`);
        }
        core_bridge_1.native.setMetricGaugeValue(this.native, value, JSON.stringify(tags));
    }
    withTags(_tags) {
        // Tags composition is handled by a MetricMeterWithComposedTags wrapper over this one
        throw new Error('withTags is not supported directly on RuntimeMetricGauge');
    }
}
class RuntimeMetricGaugeF64 {
    native;
    name;
    unit;
    description;
    kind = 'gauge';
    valueType = 'float';
    constructor(native, name, unit, description) {
        this.native = native;
        this.name = name;
        this.unit = unit;
        this.description = description;
    }
    set(value, tags = {}) {
        if (value < 0) {
            throw new Error(`MetricGauge value must be non-negative (got ${value})`);
        }
        core_bridge_1.native.setMetricGaugeF64Value(this.native, value, JSON.stringify(tags));
    }
    withTags(_tags) {
        // Tags composition is handled by a MetricMeterWithComposedTags wrapper over this one
        throw new Error('withTags is not supported directly on RuntimeMetricGaugeF64');
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////
// Buffered Metrics (aka lang-side metrics exporter)
////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * A buffer that can be set on {@link RuntimeOptions.telemetry.metricsExporter} to record
 * metrics instead of ignoring/exporting them.
 *
 * It is important that the buffer size is set to a high number and that `retrieveUpdates` is
 * called regularly to drain the buffer. If the buffer is full, metric updates will be dropped
 * and an error will be logged.
 *
 * @experimental Buffered metrics is an experimental feature. APIs may be subject to change.
 */
class MetricsBuffer {
    maxBufferSize;
    useSecondsForDurations;
    runtime = undefined;
    pendingUpdates = undefined;
    constructor(options = {}) {
        this.maxBufferSize = options.maxBufferSize ?? 10000;
        this.useSecondsForDurations = options.useSecondsForDurations ?? false;
    }
    /**
     * Bind the MetricsBuffer to the given runtime.
     *
     * @internal
     * @hidden
     */
    bind(runtime) {
        if (this.runtime !== undefined) {
            throw new common_1.IllegalStateError('MetricsBuffer already bound to a runtime');
        }
        this.runtime = runtime;
        return this;
    }
    /**
     * Unbind the MetricsBuffer from the given runtime.
     *
     * @internal
     * @hidden
     */
    unbind(runtime) {
        if (this.runtime !== undefined) {
            if (this.runtime !== runtime)
                throw new common_1.IllegalStateError('MetricsBuffer is bound to a different runtime');
            try {
                // We proactively drain buffered metrics from the native side, and keep them in the
                // pendingUpdates buffer until the user code calls retrieveUpdates(). Without this,
                // we would lose metric events on runtime shutdown.
                this.retrieveUpdatesInternal();
            }
            finally {
                this.runtime = undefined;
            }
        }
    }
    /**
     * Retrieve buffered metric updates.
     *
     * This method drains the metrics buffer and returns all metric events that have accumulated
     * since the last call to this method. This method should be called regularly when using
     * buffered metrics to prevent buffer overflow.
     *
     * @returns Array of buffered metric updates, each containing the metric metadata,
     *          current value, and attributes
     * @experimental Buffered metrics is an experimental feature. APIs may be subject to change.
     */
    retrieveUpdates() {
        this.retrieveUpdatesInternal();
        const updates = this.pendingUpdates ?? [];
        this.pendingUpdates = undefined;
        // We return an iterator instead of an array in case we should, at some point in the future,
        // need to apply per item transformation. Copying to an array would obviously be possible, the
        // buffered metric array might be large, so avoiding the extra array allocation makes sense.
        return updates.values();
    }
    /**
     * Fetch buffered metric updates from the native side, storing them in the pendingUpdates buffer.
     *
     * @internal
     * @hidden
     */
    retrieveUpdatesInternal() {
        if (this.runtime === undefined)
            return;
        try {
            const updates = core_bridge_1.native.runtimeRetrieveBufferedMetrics(this.runtime.native);
            if (updates.length > 0) {
                if (this.pendingUpdates === undefined) {
                    this.pendingUpdates = updates;
                }
                else {
                    this.pendingUpdates.push(...updates);
                }
            }
        }
        catch (error) {
            // Ignore errors on retrieving buffered metrics after the runtime has been shut down.
            if (!(error instanceof common_1.IllegalStateError))
                throw error;
        }
    }
}
exports.MetricsBuffer = MetricsBuffer;
//# sourceMappingURL=runtime-metrics.js.map