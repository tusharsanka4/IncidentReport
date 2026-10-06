/**
 * A meter for creating metrics to record values on.
 *
 * @experimental The Metric API is an experimental feature and may be subject to change.
 */
export interface MetricMeter {
    /**
     * Create a new counter metric that supports adding values.
     *
     * @param name Name for the counter metric.
     * @param unit Unit for the counter metric. Optional.
     * @param description Description for the counter metric. Optional.
     */
    createCounter(name: string, unit?: string, description?: string): MetricCounter;
    /**
     * Create a new histogram metric that supports recording values.
     *
     * @param name Name for the histogram metric.
     * @param valueType Type of value to record. Defaults to `int`.
     * @param unit Unit for the histogram metric. Optional.
     * @param description Description for the histogram metric. Optional.
     */
    createHistogram(name: string, valueType?: NumericMetricValueType, unit?: string, description?: string): MetricHistogram;
    /**
     * Create a new gauge metric that supports setting values.
     *
     * @param name Name for the gauge metric.
     * @param valueType Type of value to set. Defaults to `int`.
     * @param unit Unit for the gauge metric. Optional.
     * @param description Description for the gauge metric. Optional.
     */
    createGauge(name: string, valueType?: NumericMetricValueType, unit?: string, description?: string): MetricGauge;
    /**
     * Create a new up-down counter metric that supports adding signed values.
     *
     * @param name Name for the up-down counter metric.
     * @param unit Unit for the up-down counter metric. Optional.
     * @param description Description for the up-down counter metric. Optional.
     */
    createUpDownCounter?(name: string, unit?: string, description?: string): MetricUpDownCounter;
    /**
     * Return a clone of this meter, with additional tags. All metrics created off the meter will
     * have the tags.
     *
     * @param tags Tags to append.
     */
    withTags(tags: MetricTags): MetricMeter;
}
/**
 * Base interface for all metrics.
 *
 * @experimental The Metric API is an experimental feature and may be subject to change.
 */
export interface Metric {
    /**
     * The name of the metric.
     */
    name: string;
    /**
     * The unit of the metric, if any.
     */
    unit?: string;
    /**
     * The description of the metric, if any.
     */
    description?: string;
    /**
     * The kind of the metric (e.g. `counter`, `histogram`, `gauge`).
     */
    kind: MetricKind;
    /**
     * The type of value recorded by the metric. Either `int` or `float`.
     */
    valueType: NumericMetricValueType;
}
/**
 * Tags to be attached to some metrics.
 *
 * @experimental The Metric API is an experimental feature and may be subject to change.
 */
export type MetricTags = Record<string, string | number | boolean>;
/**
 * Type of numerical values recorded by a metric.
 *
 * Note that this represents the _configuration_ of the metric; however, since JavaScript doesn't
 * have different runtime representation for integers and floats, the actual value type is always
 * a JS 'number'.
 *
 * @experimental The Metric API is an experimental feature and may be subject to change.
 */
export type NumericMetricValueType = 'int' | 'float';
/**
 * The kind of a metric.
 *
 * @experimental The Metric API is an experimental feature and may be subject to change.
 */
export type MetricKind = 'counter' | 'histogram' | 'gauge' | 'up-down-counter';
/**
 * A metric that supports adding values as a counter.
 *
 * @experimental The Metric API is an experimental feature and may be subject to change.
 */
export interface MetricCounter extends Metric {
    /**
     * Add the given value to the counter.
     *
     * @param value Value to add.
     * @param extraTags Extra tags if any.
     */
    add(value: number, extraTags?: MetricTags): void;
    /**
     * Return a clone of this counter, with additional tags.
     *
     * @param tags Tags to append to existing tags.
     */
    withTags(tags: MetricTags): MetricCounter;
    kind: 'counter';
    valueType: 'int';
}
/**
 * A metric that supports recording values on a histogram.
 *
 * @experimental The Metric API is an experimental feature and may be subject to change.
 */
export interface MetricHistogram extends Metric {
    /**
     * Record the given value on the histogram.
     *
     * @param value Value to record. Must be a non-negative number. Value will be casted to the given
     *              {@link valueType}. Loss of precision may occur if the value is not already of the
     *              correct type.
     * @param extraTags Extra tags if any.
     */
    record(value: number, extraTags?: MetricTags): void;
    /**
     * Return a clone of this histogram, with additional tags.
     *
     * @param tags Tags to append to existing tags.
     */
    withTags(tags: MetricTags): MetricHistogram;
    kind: 'histogram';
}
/**
 * A metric that supports setting values.
 *
 * @experimental The Metric API is an experimental feature and may be subject to change.
 */
export interface MetricGauge extends Metric {
    /**
     * Set the given value on the gauge.
     *
     * @param value Value to set.
     * @param extraTags Extra tags if any.
     */
    set(value: number, extraTags?: MetricTags): void;
    /**
     * Return a clone of this gauge, with additional tags.
     *
     * @param tags Tags to append to existing tags.
     */
    withTags(tags: MetricTags): MetricGauge;
    kind: 'gauge';
}
/**
 * A metric that supports adding signed values as an up-down counter.
 *
 * @experimental The Metric API is an experimental feature and may be subject to change.
 */
export interface MetricUpDownCounter extends Metric {
    /**
     * Add the given value to the up-down counter. Value may be negative.
     *
     * @param value Value to add (can be positive or negative).
     * @param extraTags Extra tags if any.
     */
    add(value: number, extraTags?: MetricTags): void;
    /**
     * Return a clone of this up-down counter, with additional tags.
     *
     * @param tags Tags to append to existing tags.
     */
    withTags(tags: MetricTags): MetricUpDownCounter;
    kind: 'up-down-counter';
    valueType: 'int';
}
/**
 * A meter implementation that does nothing.
 */
declare class NoopMetricMeter implements MetricMeter {
    createCounter(name: string, unit?: string, description?: string): MetricCounter;
    createHistogram(name: string, valueType?: NumericMetricValueType, unit?: string, description?: string): MetricHistogram;
    createGauge(name: string, valueType?: NumericMetricValueType, unit?: string, description?: string): MetricGauge;
    createUpDownCounter(name: string, unit?: string, description?: string): MetricUpDownCounter;
    withTags(_extraTags: MetricTags): MetricMeter;
}
export declare const noopMetricMeter: NoopMetricMeter;
export type MetricTagsOrFunc = MetricTags | (() => MetricTags);
/**
 * A meter implementation that adds tags before delegating calls to a parent meter.
 *
 * @experimental The Metric API is an experimental feature and may be subject to change.
 * @internal
 * @hidden
 */
export declare class MetricMeterWithComposedTags implements MetricMeter {
    private readonly parentMeter;
    private readonly contributors;
    /**
     * Return a {@link MetricMeter} that adds tags before delegating calls to a parent meter.
     *
     * New tags may either be specified statically as a delta object, or as a function evaluated
     * every time a metric is recorded that will return a delta object.
     *
     * Some optimizations are performed to avoid creating unnecessary objects and to keep runtime
     * overhead associated with resolving tags as low as possible.
     *
     * @param meter The parent meter to delegate calls to.
     * @param tagsOrFunc New tags may either be specified statically as a delta object, or as a function
     *                   evaluated every time a metric is recorded that will return a delta object.
     * @param force if `true`, then a `MetricMeterWithComposedTags` will be created even if there
     *              is no tags to add. This is useful to add tags support to an underlying meter
     *              implementation that does not support tags directly.
     */
    static compose(meter: MetricMeter, tagsOrFunc: MetricTagsOrFunc, force?: boolean): MetricMeter;
    private constructor();
    createCounter(name: string, unit?: string, description?: string): MetricCounter;
    createHistogram(name: string, valueType?: NumericMetricValueType, unit?: string, description?: string): MetricHistogram;
    createGauge(name: string, valueType?: NumericMetricValueType, unit?: string, description?: string): MetricGauge;
    createUpDownCounter(name: string, unit?: string, description?: string): MetricUpDownCounter;
    withTags(tags: MetricTags): MetricMeter;
}
export {};
