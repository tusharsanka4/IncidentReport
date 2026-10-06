import type { MetricMeter, MetricTags, NumericMetricValueType } from '@temporalio/common';
import type { Sink, Sinks } from './sinks';
/**
 * Sink interface for forwarding metrics from the Workflow sandbox to the Worker.
 *
 * These sink functions are not intended to be called directly from workflow code; instead,
 * developers should use the `metricMeter` object exposed to workflow code by the SDK, which
 * provides an API that is easier to work with.
 *
 * This sink interface is also not meant to be implemented by user.
 *
 * @hidden
 * @internal Users should not implement this interface, nor use it directly. Use `metricMeter` instead.
 */
export interface MetricSinks extends Sinks {
    __temporal_metrics: WorkflowMetricMeter;
}
/**
 * @hidden
 * @internal Users should not implement this interface, nor use it directly. Use `metricMeter` instead.
 */
export interface WorkflowMetricMeter extends Sink {
    addMetricCounterValue(metricName: string, unit: string | undefined, description: string | undefined, value: number, attrs: MetricTags): void;
    recordMetricHistogramValue(metricName: string, valueType: NumericMetricValueType, unit: string | undefined, description: string | undefined, value: number, attrs: MetricTags): void;
    setMetricGaugeValue(metricName: string, valueType: NumericMetricValueType, unit: string | undefined, description: string | undefined, value: number, attrs: MetricTags): void;
}
/**
 * A MetricMeter that can be used to emit metrics from within a Workflow.
 *
 * @experimental The Metric API is an experimental feature and may be subject to change.
 */
export declare const metricMeter: MetricMeter;
