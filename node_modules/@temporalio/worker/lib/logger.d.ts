import { LogLevel, LogMetadata, Logger } from '@temporalio/common';
/** @deprecated Import from @temporalio/common instead */
export { LogLevel, LogMetadata, Logger };
export interface LogEntry {
    /**
     * Log message
     */
    message: string;
    /**
     * Log level
     */
    level: LogLevel;
    /**
     * Time since epoch, in nanoseconds.
     */
    timestampNanos: bigint;
    /**
     * Custom attributes
     */
    meta?: LogMetadata;
}
export declare const LogTimestamp: unique symbol;
/**
 * Log messages to `stderr` using basic formatting
 */
declare function defaultLogFunction(entry: LogEntry): void;
/**
 * Default worker logger - uses a default log function to log messages to `console.error`.
 * See constructor arguments for customization.
 */
export declare class DefaultLogger implements Logger {
    readonly level: LogLevel;
    protected readonly logFunction: typeof defaultLogFunction;
    protected readonly severity: number;
    constructor(level?: LogLevel, logFunction?: typeof defaultLogFunction);
    log(level: LogLevel, message: string, meta?: LogMetadata): void;
    trace(message: string, meta?: LogMetadata): void;
    debug(message: string, meta?: LogMetadata): void;
    info(message: string, meta?: LogMetadata): void;
    warn(message: string, meta?: LogMetadata): void;
    error(message: string, meta?: LogMetadata): void;
}
/**
 * @internal
 */
export declare function hasColorSupport(logger: Logger): boolean;
export interface FlushableLogger extends Logger {
    flush(): void;
    close?(): void;
}
export declare function isFlushableLogger(logger: Logger): logger is FlushableLogger;
