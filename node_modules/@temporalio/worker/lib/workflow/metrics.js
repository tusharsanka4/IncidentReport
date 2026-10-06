"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initMetricSink = initMetricSink;
function initMetricSink(metricMeter) {
    // Creation of a new metric object isn't quite cheap, requiring a call down the bridge to the
    // actual Metric Meter. Unfortunately, the workflow sandbox execution model doesn't allow to
    // reuse metric objects from the caller side. We therefore maintain local caches of metric
    // objects to avoid creating a new one for every single metric value being emitted.
    const cache = new Map();
    function getOrCreate(key, create) {
        let value = cache.get(key)?.deref();
        if (value === undefined) {
            value = create();
            cache.set(key, new WeakRef(value));
        }
        return value;
    }
    return {
        __temporal_metrics: {
            addMetricCounterValue: {
                fn(_, metricName, unit, description, value, attrs) {
                    const cacheKey = `${metricName}:counter`;
                    const createFn = () => metricMeter.createCounter(metricName, unit, description);
                    getOrCreate(cacheKey, createFn).add(value, attrs);
                },
                callDuringReplay: false,
            },
            recordMetricHistogramValue: {
                fn(_, metricName, valueType, unit, description, value, attrs) {
                    const cacheKey = `histogram:${valueType}:${metricName}`;
                    const createFn = () => metricMeter.createHistogram(metricName, valueType, unit, description);
                    getOrCreate(cacheKey, createFn).record(value, attrs);
                },
                callDuringReplay: false,
            },
            setMetricGaugeValue: {
                fn(_, metricName, valueType, unit, description, value, attrs) {
                    const cacheKey = `gauge:${valueType}:${metricName}`;
                    const createFn = () => metricMeter.createGauge(metricName, valueType, unit, description);
                    getOrCreate(cacheKey, createFn).set(value, attrs);
                },
                callDuringReplay: false,
            },
        },
    };
}
//# sourceMappingURL=metrics.js.map