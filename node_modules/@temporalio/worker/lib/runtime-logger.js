"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeLogCollector = void 0;
const heap_js_1 = require("heap-js");
const common_1 = require("@temporalio/common");
const logger_1 = require("./logger");
/**
 * A log collector that accepts log entries either through the TS `Logger` interface (e.g. used by
 * the Worker, and backing Workflows and Activities Context logging) or by pushing from the native
 * layer. Logs are buffered for a short period of time, then sorted and emitted to a downstream
 * logger, in the right order.
 *
 * @internal
 * @hidden
 */
class NativeLogCollector {
    /**
     * The Logger instance ti be used to send logs to this collector
     */
    logger;
    /**
     * The downstream logger to which this collector reemits logs.
     */
    downstream;
    buffer = new heap_js_1.Heap((a, b) => Number(a.timestampNanos - b.timestampNanos));
    /**
     * A timer that periodically flushes the buffer to the downstream logger.
     */
    flushIntervalTimer;
    /**
     * The minimum time an entry should be buffered before getting flushed.
     *
     * Increasing this value allows the buffer to do a better job of correctly reordering messages
     * emitted from different sources (notably from Workflow executions through Sinks, and from Core)
     * based on their absolute timestamps, but also increases latency of logs.
     *
     * The minimum buffer time requirement only applies as long as the buffer is not full. Once the
     * buffer reaches its maximum size, older messages are unconditionally flushed, to prevent
     * unbounded growth of the buffer.
     *
     * TODO(JWH): Is 100ms a reasonable compromise? That might seem a little high on latency, but to
     *            be useful, that value needs to exceed the time it typically takes to process
     *            Workflow Activations, let's say above the expected P90, but that's highly variable
     *            across our user base, and we don't really have field data anyway.
     *            We can revisit depending on user feedback.
     */
    minBufferTimeMs = 100;
    /**
     * Interval between flush passes checking for expired messages.
     *
     * This really is redundant, since Core itself is expected to flush its buffer every 10 ms, and
     * we're checking for expired messages when it does. However, Core will only flush if it has
     * accumulated at least one message; when Core's log level is set to WARN or higher, it may be
     * many seconds, and even minutes, between Core's log messages, resulting in very rare flush
     * from that end, which cause considerable delay on flushing log messages from other sources.
     */
    flushPassIntervalMs = 100;
    /**
     * The maximum number of log messages to buffer before flushing.
     *
     * When the buffer reaches this limit, older messages are unconditionally flushed (i.e. without
     * regard to the minimum buffer time requirement), to prevent unbounded growth of the buffer.
     */
    maxBufferSize = 2000;
    constructor(downstream) {
        this.logger = new logger_1.DefaultLogger('TRACE', this.appendOne.bind(this));
        this.logger.flush = this.flush.bind(this);
        this.logger.close = this.close.bind(this);
        this.downstream = downstream;
        this.receive = this.receive.bind(this);
        // Flush matured messages from the buffer every so often.
        // Unref'ed so that it doesn't prevent the process from exiting if ever the
        // runtime doesn't close the logger properly for whatever reason.
        this.flushIntervalTimer = setInterval(this.flushMatured.bind(this), this.flushPassIntervalMs).unref();
    }
    /**
     * Accept logs pushed from the native layer.
     *
     * Called from the native layer; this function is not allowed to throw.
     */
    receive(entries) {
        try {
            for (const entry of entries) {
                const log = this.convertFromNativeLogEntry(entry);
                if (log) {
                    this.buffer.add(log);
                }
            }
            this.flushExcess();
            this.flushMatured();
        }
        catch (_e) {
            // We're not allowed to throw from here, and conversion errors have already been handled in
            // convertFromNativeLogEntry(), so an error at this point almost certainly indicates a problem
            // with the downstream logger. Just swallow it, there's really nothing else we can do.
        }
    }
    appendOne(entry) {
        this.buffer.add(entry);
        this.flushExcess();
    }
    convertFromNativeLogEntry(entry) {
        try {
            const log = JSON.parse(entry);
            const timestampNanos = BigInt(log.timestamp);
            return {
                message: log.message,
                timestampNanos,
                level: log.level,
                meta: {
                    [logger_1.LogTimestamp]: timestampNanos,
                    sdkComponent: common_1.SdkComponent.core,
                    target: log.target,
                    spanContexts: log.spanContexts,
                    ...log.fields,
                },
            };
        }
        catch (e) {
            this.downstream.error(`Error converting native log entry: ${e}`, {
                error: e,
                entry,
            });
            return undefined;
        }
    }
    /**
     * Flush messages that have exceeded their required minimal buffering time.
     */
    flushMatured() {
        const threadholdTimeNanos = BigInt(Date.now() - this.minBufferTimeMs) * 1000000n;
        for (;;) {
            const entry = this.buffer.peek();
            if (!entry || entry.timestampNanos > threadholdTimeNanos)
                break;
            this.buffer.pop();
            this.downstream.log(entry.level, entry.message, {
                [logger_1.LogTimestamp]: entry.timestampNanos,
                ...entry.meta,
            });
        }
    }
    /**
     * Flush messages in excess of the buffer size limit, starting with oldest ones, without regard
     * to the `minBufferTimeMs` requirement. This is called every time messages are appended to the
     * buffer, to prevent unbounded growth of the buffer when messages are being emitted at high rate.
     *
     * The only downside of flushing messages before their time is that it increases the probability
     * that messages from different sources might end up being passed down to the downstream logger
     * in the wrong order; e.g. if an "older" message emitted by the Workflow Logger is received by
     * the Collector after we've already flushed a "newer" message emitted by Core. This is totally
     * acceptable, and definitely better than a memory leak caused by unbounded growth of the buffer.
     */
    flushExcess() {
        let excess = this.buffer.size() - this.maxBufferSize;
        while (excess-- > 0) {
            const entry = this.buffer.pop();
            if (!entry)
                break;
            this.downstream.log(entry.level, entry.message, {
                [logger_1.LogTimestamp]: entry.timestampNanos,
                ...entry.meta,
            });
        }
    }
    /**
     * Flush all messages contained in the buffer, without regard to the `minBufferTimeMs` requirement.
     *
     * This is called on Runtime and on Worker shutdown.
     */
    flush() {
        for (const entry of this.buffer) {
            this.downstream.log(entry.level, entry.message, {
                [logger_1.LogTimestamp]: entry.timestampNanos,
                ...entry.meta,
            });
        }
    }
    close() {
        this.flush();
        clearInterval(this.flushIntervalTimer);
    }
}
exports.NativeLogCollector = NativeLogCollector;
//# sourceMappingURL=runtime-logger.js.map