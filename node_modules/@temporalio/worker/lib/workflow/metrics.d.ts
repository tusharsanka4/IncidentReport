import { type MetricMeter } from '@temporalio/common';
import type { MetricSinks } from '@temporalio/workflow/lib/metrics';
import type { InjectedSinks } from '../sinks';
export declare function initMetricSink(metricMeter: MetricMeter): InjectedSinks<MetricSinks>;
