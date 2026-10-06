import type { Metric, MetricCounter, MetricGauge, MetricHistogram, MetricMeter, MetricTags, MetricUpDownCounter, NumericMetricValueType } from '@temporalio/common';
import { native } from '@temporalio/core-bridge';
import type { Runtime } from './runtime';
/**
 * An implementation of the {@link MetricMeter} interface that pushes emitted metrics through
 * the bridge, to be collected by whatever exporter is configured on the Core Runtime.
 *
 * @internal
 */
export declare class RuntimeMetricMeter implements MetricMeter {
    protected runtime: native.Runtime;
    constructor(runtime: native.Runtime);
    createCounter(name: string, unit?: string, description?: string): MetricCounter;
    createHistogram(name: string, valueType?: NumericMetricValueType, unit?: string, description?: string): MetricHistogram;
    createGauge(name: string, valueType?: NumericMetricValueType, unit?: string, description?: string): MetricGauge;
    createUpDownCounter(name: string, unit?: string, description?: string): MetricUpDownCounter;
    withTags(_extraTags: MetricTags): MetricMeter;
}
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
export declare class MetricsBuffer {
    readonly maxBufferSize: number;
    readonly useSecondsForDurations: boolean;
    private runtime;
    private pendingUpdates;
    constructor(options?: MetricsBufferOptions);
    /**
     * Bind the MetricsBuffer to the given runtime.
     *
     * @internal
     * @hidden
     */
    bind(runtime: Runtime): MetricsBuffer;
    /**
     * Unbind the MetricsBuffer from the given runtime.
     *
     * @internal
     * @hidden
     */
    unbind(runtime: Runtime): void;
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
    retrieveUpdates(): ArrayIterator<BufferedMetricUpdate>;
    /**
     * Fetch buffered metric updates from the native side, storing them in the pendingUpdates buffer.
     *
     * @internal
     * @hidden
     */
    private retrieveUpdatesInternal;
}
export interface MetricsBufferOptions {
    /**
     * Maximum number of metric events to buffer before dropping new events.
     *
     * The buffer accumulates metric updates from Core and should be drained regularly by calling
     * {@link Runtime.retrieveBufferedMetrics}. If the buffer fills up, new metric updates will be
     * dropped and an error will be logged.
     *
     * @default 10000
     */
    maxBufferSize?: number;
    /**
     * If set to true, the exporter will use seconds for durations instead of milliseconds.
     *
     * @default false
     */
    useSecondsForDurations?: boolean;
}
/**
 * A single update event on a metric, recorded by buffered metrics exporter.
 *
 * When the {@link Runtime} is configured to buffer metrics, user code must regularly call
 * {@link MetricsBuffer.retrieveUpdates} to retrieve the buffered metric updates. Each update
 * event will be represented as a single instance of this interface.
 *
 * @experimental Buffered metrics is an experimental feature. APIs may be subject to change.
 */
export interface BufferedMetricUpdate {
    /**
     * The metric being updated.
     *
     * For performance reasons, the SDK tries to re-use the same object across updates for the same
     * metric. User code may take advantage of this, e.g. by attaching downstream metric references to
     * as a supplementary property on the `Metric` object. Note that the SDK may sometimes miss
     * deduplication opportunities, notably when a same metric is accessed from different execution
     * contexts (e.g. from both activity code and workflow code).
     */
    metric: Metric;
    /**
     * Value for this update event.
     *
     * For counters this is a delta; for gauges and histograms this is the value itself.
     */
    value: number;
    /**
     * Attributes for this update event.
     *
     * For performance reasons, the SDK tries to re-use the same object across updates for the same
     * attribute set. User code may take advantage of this, e.g. by attaching downstream attribute
     * sets references as a supplementary, _non-enumerable_ property on the `MetricTags` object. Make
     * sure however not to add, modify or delete any enumerable properties on the `MetricTags` object,
     * as those changes would affect future update events using the same `MetricTags` object, as well
     * as further events that extend that `MetricTags` object.
     *
     * Note that the SDK may miss deduplication opportunities, notably when a same set of attributes
     * is recreated by the code emitting the metric updates.
     */
    attributes: MetricTags;
}
