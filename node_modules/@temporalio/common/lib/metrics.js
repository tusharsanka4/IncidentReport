"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricMeterWithComposedTags = exports.noopMetricMeter = void 0;
const internal_workflow_1 = require("./internal-workflow");
////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * A meter implementation that does nothing.
 */
class NoopMetricMeter {
    createCounter(name, unit, description) {
        return {
            name,
            unit,
            description,
            kind: 'counter',
            valueType: 'int',
            add(_value, _extraTags) { },
            withTags(_extraTags) {
                return this;
            },
        };
    }
    createHistogram(name, valueType = 'int', unit, description) {
        return {
            name,
            unit,
            description,
            kind: 'histogram',
            valueType,
            record(_value, _extraTags) { },
            withTags(_extraTags) {
                return this;
            },
        };
    }
    createGauge(name, valueType = 'int', unit, description) {
        return {
            name,
            unit,
            description,
            kind: 'gauge',
            valueType,
            set(_value, _extraTags) { },
            withTags(_extraTags) {
                return this;
            },
        };
    }
    createUpDownCounter(name, unit, description) {
        return {
            name,
            unit,
            description,
            kind: 'up-down-counter',
            valueType: 'int',
            add(_value, _extraTags) { },
            withTags(_extraTags) {
                return this;
            },
        };
    }
    withTags(_extraTags) {
        return this;
    }
}
exports.noopMetricMeter = new NoopMetricMeter();
/**
 * A meter implementation that adds tags before delegating calls to a parent meter.
 *
 * @experimental The Metric API is an experimental feature and may be subject to change.
 * @internal
 * @hidden
 */
class MetricMeterWithComposedTags {
    parentMeter;
    contributors;
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
    static compose(meter, tagsOrFunc, force = false) {
        if (meter instanceof MetricMeterWithComposedTags) {
            const contributors = appendToChain(meter.contributors, tagsOrFunc);
            // If the new contributor results in no actual change to the chain, then we don't need a new meter
            if (contributors === undefined && !force)
                return meter;
            return new MetricMeterWithComposedTags(meter.parentMeter, contributors ?? []);
        }
        else {
            const contributors = appendToChain(undefined, tagsOrFunc);
            if (contributors === undefined && !force)
                return meter;
            return new MetricMeterWithComposedTags(meter, contributors ?? []);
        }
    }
    constructor(parentMeter, contributors) {
        this.parentMeter = parentMeter;
        this.contributors = contributors;
    }
    createCounter(name, unit, description) {
        const parentCounter = this.parentMeter.createCounter(name, unit, description);
        return new MetricCounterWithComposedTags(parentCounter, this.contributors);
    }
    createHistogram(name, valueType = 'int', unit, description) {
        const parentHistogram = this.parentMeter.createHistogram(name, valueType, unit, description);
        return new MetricHistogramWithComposedTags(parentHistogram, this.contributors);
    }
    createGauge(name, valueType = 'int', unit, description) {
        const parentGauge = this.parentMeter.createGauge(name, valueType, unit, description);
        return new MetricGaugeWithComposedTags(parentGauge, this.contributors);
    }
    createUpDownCounter(name, unit, description) {
        // FIXME: Remove this guard once up-down-counter support is complete on all MetricMeter
        // implementations and `createUpDownCounter` is no longer optional on MetricMeter.
        if (!this.parentMeter.createUpDownCounter) {
            throw new Error('createUpDownCounter is not supported by the underlying meter');
        }
        const parentCounter = this.parentMeter.createUpDownCounter(name, unit, description);
        return new MetricUpDownCounterWithComposedTags(parentCounter, this.contributors);
    }
    withTags(tags) {
        return MetricMeterWithComposedTags.compose(this, tags);
    }
}
exports.MetricMeterWithComposedTags = MetricMeterWithComposedTags;
/**
 * @experimental The Metric API is an experimental feature and may be subject to change.
 */
class MetricCounterWithComposedTags {
    parentCounter;
    contributors;
    kind = 'counter';
    valueType = 'int';
    constructor(parentCounter, contributors) {
        this.parentCounter = parentCounter;
        this.contributors = contributors;
    }
    add(value, extraTags) {
        this.parentCounter.add(value, resolveTags(this.contributors, extraTags));
    }
    withTags(extraTags) {
        const contributors = appendToChain(this.contributors, extraTags);
        if (contributors === undefined)
            return this;
        return new MetricCounterWithComposedTags(this.parentCounter, contributors);
    }
    get name() {
        return this.parentCounter.name;
    }
    get unit() {
        return this.parentCounter.unit;
    }
    get description() {
        return this.parentCounter.description;
    }
}
/**
 * @experimental The Metric API is an experimental feature and may be subject to change.
 */
class MetricHistogramWithComposedTags {
    parentHistogram;
    contributors;
    kind = 'histogram';
    constructor(parentHistogram, contributors) {
        this.parentHistogram = parentHistogram;
        this.contributors = contributors;
    }
    record(value, extraTags) {
        this.parentHistogram.record(value, resolveTags(this.contributors, extraTags));
    }
    withTags(extraTags) {
        const contributors = appendToChain(this.contributors, extraTags);
        if (contributors === undefined)
            return this;
        return new MetricHistogramWithComposedTags(this.parentHistogram, contributors);
    }
    get name() {
        return this.parentHistogram.name;
    }
    get valueType() {
        return this.parentHistogram.valueType;
    }
    get unit() {
        return this.parentHistogram.unit;
    }
    get description() {
        return this.parentHistogram.description;
    }
}
/**
 * @internal
 * @hidden
 */
class MetricGaugeWithComposedTags {
    parentGauge;
    contributors;
    kind = 'gauge';
    constructor(parentGauge, contributors) {
        this.parentGauge = parentGauge;
        this.contributors = contributors;
    }
    set(value, extraTags) {
        this.parentGauge.set(value, resolveTags(this.contributors, extraTags));
    }
    withTags(extraTags) {
        const contributors = appendToChain(this.contributors, extraTags);
        if (contributors === undefined)
            return this;
        return new MetricGaugeWithComposedTags(this.parentGauge, contributors);
    }
    get name() {
        return this.parentGauge.name;
    }
    get valueType() {
        return this.parentGauge.valueType;
    }
    get unit() {
        return this.parentGauge.unit;
    }
    get description() {
        return this.parentGauge.description;
    }
}
/**
 * @internal
 * @hidden
 */
class MetricUpDownCounterWithComposedTags {
    parentCounter;
    contributors;
    kind = 'up-down-counter';
    valueType = 'int';
    constructor(parentCounter, contributors) {
        this.parentCounter = parentCounter;
        this.contributors = contributors;
    }
    add(value, extraTags) {
        this.parentCounter.add(value, resolveTags(this.contributors, extraTags));
    }
    withTags(extraTags) {
        const contributors = appendToChain(this.contributors, extraTags);
        if (contributors === undefined)
            return this;
        return new MetricUpDownCounterWithComposedTags(this.parentCounter, contributors);
    }
    get name() {
        return this.parentCounter.name;
    }
    get unit() {
        return this.parentCounter.unit;
    }
    get description() {
        return this.parentCounter.description;
    }
}
function resolveTags(contributors, extraTags) {
    const resolved = {};
    for (const contributor of contributors) {
        Object.assign(resolved, typeof contributor === 'function' ? contributor() : contributor);
    }
    Object.assign(resolved, extraTags);
    return (0, internal_workflow_1.filterNullAndUndefined)(resolved);
}
/**
 * Append a tags contributor to the chain, merging it with the former last contributor if possible.
 *
 * If appending the new contributor results in no actual change to the chain of contributors, return
 * `existingContributors`; in that case, the caller should avoid creating a new object if possible.
 */
function appendToChain(existingContributors, newContributor) {
    // If the new contributor is an empty object, then it results in no actual change to the chain
    if (typeof newContributor === 'object' && Object.keys(newContributor).length === 0) {
        return existingContributors;
    }
    // If existing chain is empty, then the new contributor is the chain
    if (existingContributors == null || existingContributors.length === 0) {
        return [newContributor];
    }
    // If both last contributor and new contributor are plain objects, merge them to a single object.
    const last = existingContributors[existingContributors.length - 1];
    if (typeof last === 'object' && typeof newContributor === 'object') {
        const merged = (0, internal_workflow_1.mergeObjects)(last, newContributor);
        if (merged === last)
            return existingContributors;
        return [...existingContributors.slice(0, -1), merged];
    }
    // Otherwise, just append the new contributor to the chain.
    return [...existingContributors, newContributor];
}
//# sourceMappingURL=metrics.js.map