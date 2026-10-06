import { native } from '@temporalio/core-bridge';
import type { Logger, MetricMeter } from '@temporalio/common';
import { History } from '@temporalio/common/lib/proto-utils';
import type { MetricsBuffer } from './runtime-metrics';
import type { NativeConnectionOptions } from './connection-options';
import type { CompiledRuntimeOptions, RuntimeOptions } from './runtime-options';
export { History };
type TrackedNativeObject = native.Client | native.Worker | native.EphemeralServer;
/**
 * Core singleton representing an instance of the Rust Core SDK
 *
 * Use {@link install} in order to customize the server connection options or other global process options.
 */
export declare class Runtime {
    readonly native: native.Runtime;
    readonly options: CompiledRuntimeOptions;
    readonly logger: Logger;
    /** The metric meter associated with this runtime. */
    readonly metricMeter: MetricMeter;
    /**
     * The metrics buffer associated with this runtime, if buffered metrics are enabled.
     *
     * @experimental Buffered metrics is an experimental feature. APIs may be subject to change.
     */
    readonly metricsBuffer: MetricsBuffer | undefined;
    /** Track the number of pending creation calls into the tokio runtime to prevent shut down */
    protected pendingCreations: number;
    /** Track the registered native objects to automatically shutdown when all have been deregistered */
    protected readonly backRefs: Set<TrackedNativeObject>;
    protected readonly shutdownSignalCallbacks: Set<() => void>;
    protected state: 'RUNNING' | 'SHUTTING_DOWN';
    static _instance?: Runtime;
    static instantiator?: 'install' | 'instance';
    /**
     * Default options get overridden when Core is installed and are remembered in case Core is
     * re-instantiated after being shut down
     */
    static defaultOptions: RuntimeOptions;
    protected constructor(native: native.Runtime, options: CompiledRuntimeOptions);
    /**
     * Instantiate a new Core object and set it as the singleton instance
     *
     * If Core has already been instantiated with {@link instance} or this method,
     * will throw a {@link IllegalStateError}.
     */
    static install(options: RuntimeOptions): Runtime;
    /**
     * Get or instantiate the singleton Core object
     *
     * If Core has not been instantiated with {@link install} or this method,
     * a new Core instance will be installed and configured to connect to
     * a local server.
     */
    static instance(): Runtime;
    /**
     * Factory function for creating a new Core instance, not exposed because Core is meant to be used as a singleton
     */
    protected static create(options: RuntimeOptions, instantiator: 'install' | 'instance'): Runtime;
    /**
     * Flush any buffered logs.
     */
    flushLogs(): void;
    /**
     * Create a Core Connection object to power Workers
     *
     * Hidden in the docs because it is only meant to be used internally by the Worker.
     * @hidden
     */
    createNativeClient(options?: NativeConnectionOptions): Promise<native.Client>;
    /**
     * Close a native Client, if this is the last registered Client or Worker, shutdown the core and unset the singleton instance
     *
     * Hidden in the docs because it is only meant to be used internally by the Worker.
     * @hidden
     */
    closeNativeClient(client: native.Client): Promise<void>;
    /**
     * Register a Worker, this is required for automatically shutting down when all Workers have been deregistered
     *
     * Hidden in the docs because it is only meant to be used internally by the Worker.
     * @hidden
     */
    registerWorker(client: native.Client, options: native.WorkerOptions): Promise<native.Worker>;
    /** @hidden */
    createReplayWorker(options: native.WorkerOptions): Promise<[native.Worker, native.HistoryPusher]>;
    /**
     * Push history to a replay worker's history pusher stream.
     *
     * Hidden in the docs because it is only meant to be used internally by the Worker.
     *
     * @hidden
     */
    pushHistory(pusher: native.HistoryPusher, workflowId: string, history: History): Promise<void>;
    /**
     * Close a replay worker's history pusher stream.
     *
     * Hidden in the docs because it is only meant to be used internally by the Worker.
     *
     * @hidden
     */
    closeHistoryStream(pusher: native.HistoryPusher): void;
    /**
     * Deregister a Worker, if this is the last registered Worker or Client, shutdown the core and unset the singleton instance
     *
     * Hidden in the docs because it is only meant to be used internally by the Worker.
     * @hidden
     */
    deregisterWorker(worker: native.Worker): Promise<void>;
    /**
     * Create an ephemeral Temporal server.
     *
     * Hidden since it is meant to be used internally by the testing framework.
     * @hidden
     */
    createEphemeralServer(options: native.EphemeralServerConfig): Promise<native.EphemeralServer>;
    /**
     * Shut down an ephemeral Temporal server.
     *
     * Hidden since it is meant to be used internally by the testing framework.
     * @hidden
     */
    shutdownEphemeralServer(server: native.EphemeralServer): Promise<void>;
    protected createNative<R extends TrackedNativeObject, Args extends any[], F extends (...args: Args) => Promise<R>>(f: F, ...args: Args): Promise<R>;
    protected createNativeNoBackRef<R, Args extends any[], F extends (...args: Args) => Promise<R>>(f: F, ...args: Args): Promise<R>;
    protected isIdle(): boolean;
    protected shutdownIfIdle(): Promise<void>;
    /**
     * Shutdown and unset the singleton instance.
     *
     * If the runtime is polling on Core logs, wait for those logs to be collected.
     *
     * @hidden
     * @internal
     */
    shutdown(): Promise<void>;
    /**
     * Used by Workers to register for shutdown signals
     *
     * @hidden
     * @internal
     */
    registerShutdownSignalCallback(callback: () => void): void;
    /**
     * Used by Workers to deregister handlers registered with {@link registerShutdownSignalCallback}
     *
     * @hidden
     * @internal
     */
    deregisterShutdownSignalCallback(callback: () => void): void;
    /**
     * Set up the shutdown hook, listen on shutdownSignals
     */
    protected setupShutdownHook(): void;
    /**
     * Stop listening on shutdownSignals
     */
    protected teardownShutdownHook(): void;
    /**
     * Bound to `this` for use with `process.on` and `process.off`
     */
    protected startShutdownSequence: () => void;
    protected checkHeapSizeLimit(): void;
    protected tryReadNumberFileSync(file: string): number | undefined;
}
