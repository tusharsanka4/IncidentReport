import { Heap } from 'heap-js';
import type { native } from '@temporalio/core-bridge';
import type { LogEntry, Logger } from './logger';
/**
 * A log collector that accepts log entries either through the TS `Logger` interface (e.g. used by
 * the Worker, and backing Workflows and Activities Context logging) or by pushing from the native
 * layer. Logs are buffered for a short period of time, then sorted and emitted to a downstream
 * logger, in the right order.
 *
 * @internal
 * @hidden
 */
export declare class NativeLogCollector {
    /**
     * The Logger instance ti be used to send logs to this collector
     */
    readonly logger: Logger;
    /**
     * The downstream logger to which this collector reemits logs.
     */
    protected readonly downstream: Logger;
    protected buffer: Heap<LogEntry>;
    /**
     * A timer that periodically flushes the buffer to the downstream logger.
     */
    protected flushIntervalTimer: NodeJS.Timeout;
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
    protected readonly minBufferTimeMs = 100;
    /**
     * Interval between flush passes checking for expired messages.
     *
     * This really is redundant, since Core itself is expected to flush its buffer every 10 ms, and
     * we're checking for expired messages when it does. However, Core will only flush if it has
     * accumulated at least one message; when Core's log level is set to WARN or higher, it may be
     * many seconds, and even minutes, between Core's log messages, resulting in very rare flush
     * from that end, which cause considerable delay on flushing log messages from other sources.
     */
    protected readonly flushPassIntervalMs = 100;
    /**
     * The maximum number of log messages to buffer before flushing.
     *
     * When the buffer reaches this limit, older messages are unconditionally flushed (i.e. without
     * regard to the minimum buffer time requirement), to prevent unbounded growth of the buffer.
     */
    protected readonly maxBufferSize = 2000;
    constructor(downstream: Logger);
    /**
     * Accept logs pushed from the native layer.
     *
     * Called from the native layer; this function is not allowed to throw.
     */
    receive(entries: native.JsonString<native.LogEntry>[]): void;
    private appendOne;
    private convertFromNativeLogEntry;
    /**
     * Flush messages that have exceeded their required minimal buffering time.
     */
    private flushMatured;
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
    private flushExcess;
    /**
     * Flush all messages contained in the buffer, without regard to the `minBufferTimeMs` requirement.
     *
     * This is called on Runtime and on Worker shutdown.
     */
    flush(): void;
    close(): void;
}
