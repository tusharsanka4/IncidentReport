"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Runtime = void 0;
const v8 = __importStar(require("node:v8"));
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
const core_bridge_1 = require("@temporalio/core-bridge");
const internal_workflow_1 = require("@temporalio/common/lib/internal-workflow");
const common_1 = require("@temporalio/common");
const proto_1 = require("@temporalio/proto");
const metrics_1 = require("@temporalio/common/lib/metrics");
const logger_1 = require("./logger");
const runtime_metrics_1 = require("./runtime-metrics");
const connection_options_1 = require("./connection-options");
const utils_1 = require("./utils");
const runtime_options_1 = require("./runtime-options");
/**
 * Core singleton representing an instance of the Rust Core SDK
 *
 * Use {@link install} in order to customize the server connection options or other global process options.
 */
class Runtime {
    native;
    options;
    logger;
    /** The metric meter associated with this runtime. */
    metricMeter;
    /**
     * The metrics buffer associated with this runtime, if buffered metrics are enabled.
     *
     * @experimental Buffered metrics is an experimental feature. APIs may be subject to change.
     */
    metricsBuffer;
    /** Track the number of pending creation calls into the tokio runtime to prevent shut down */
    pendingCreations = 0;
    /** Track the registered native objects to automatically shutdown when all have been deregistered */
    backRefs = new Set();
    shutdownSignalCallbacks = new Set();
    state = 'RUNNING';
    static _instance;
    static instantiator;
    /**
     * Default options get overridden when Core is installed and are remembered in case Core is
     * re-instantiated after being shut down
     */
    static defaultOptions = {};
    constructor(native, options) {
        this.native = native;
        this.options = options;
        this.logger = options.logger;
        this.metricsBuffer = options.metricsBuffer?.bind(this);
        this.metricMeter = options.runtimeOptions.metricsExporter
            ? metrics_1.MetricMeterWithComposedTags.compose(new runtime_metrics_1.RuntimeMetricMeter(this.native), {}, true)
            : common_1.noopMetricMeter;
        this.checkHeapSizeLimit();
        this.setupShutdownHook();
    }
    /**
     * Instantiate a new Core object and set it as the singleton instance
     *
     * If Core has already been instantiated with {@link instance} or this method,
     * will throw a {@link IllegalStateError}.
     */
    static install(options) {
        if (this._instance !== undefined) {
            if (this.instantiator === 'install') {
                throw new common_1.IllegalStateError('Runtime singleton has already been installed');
            }
            else if (this.instantiator === 'instance') {
                throw new common_1.IllegalStateError('Runtime singleton has already been instantiated. Did you start a Worker before calling `install`?');
            }
        }
        return this.create(options, 'install');
    }
    /**
     * Get or instantiate the singleton Core object
     *
     * If Core has not been instantiated with {@link install} or this method,
     * a new Core instance will be installed and configured to connect to
     * a local server.
     */
    static instance() {
        const existingInst = this._instance;
        if (existingInst !== undefined) {
            return existingInst;
        }
        return this.create(this.defaultOptions, 'instance');
    }
    /**
     * Factory function for creating a new Core instance, not exposed because Core is meant to be used as a singleton
     */
    static create(options, instantiator) {
        const compiledOptions = (0, runtime_options_1.compileOptions)(options);
        const runtime = core_bridge_1.native.newRuntime(compiledOptions.runtimeOptions);
        // Remember the provided options in case Core is reinstantiated after being shut down
        this.defaultOptions = options;
        this.instantiator = instantiator;
        this._instance = new this(runtime, compiledOptions);
        return this._instance;
    }
    /**
     * Flush any buffered logs.
     */
    flushLogs() {
        if ((0, logger_1.isFlushableLogger)(this.logger)) {
            this.logger.flush();
        }
    }
    /**
     * Create a Core Connection object to power Workers
     *
     * Hidden in the docs because it is only meant to be used internally by the Worker.
     * @hidden
     */
    async createNativeClient(options) {
        return await this.createNative(core_bridge_1.native.newClient, this.native, (0, connection_options_1.toNativeClientOptions)((0, internal_workflow_1.filterNullAndUndefined)(options ?? {})));
    }
    /**
     * Close a native Client, if this is the last registered Client or Worker, shutdown the core and unset the singleton instance
     *
     * Hidden in the docs because it is only meant to be used internally by the Worker.
     * @hidden
     */
    async closeNativeClient(client) {
        core_bridge_1.native.clientClose(client);
        this.backRefs.delete(client);
        await this.shutdownIfIdle();
    }
    /**
     * Register a Worker, this is required for automatically shutting down when all Workers have been deregistered
     *
     * Hidden in the docs because it is only meant to be used internally by the Worker.
     * @hidden
     */
    async registerWorker(client, options) {
        return await this.createNativeNoBackRef(async () => {
            const worker = core_bridge_1.native.newWorker(client, options);
            const buffer = await core_bridge_1.native.workerValidate(worker);
            const _namespaceInfo = proto_1.coresdk.NamespaceInfo.decode(new Uint8Array(buffer));
            this.backRefs.add(worker);
            return worker;
        });
    }
    /** @hidden */
    async createReplayWorker(options) {
        return await this.createNativeNoBackRef(async () => {
            const [worker, pusher] = core_bridge_1.native.newReplayWorker(this.native, options);
            this.backRefs.add(worker);
            return [worker, pusher];
        });
    }
    /**
     * Push history to a replay worker's history pusher stream.
     *
     * Hidden in the docs because it is only meant to be used internally by the Worker.
     *
     * @hidden
     */
    async pushHistory(pusher, workflowId, history) {
        const encoded = (0, utils_1.byteArrayToBuffer)(proto_1.temporal.api.history.v1.History.encodeDelimited(history).finish());
        return await core_bridge_1.native.pushHistory(pusher, workflowId, encoded);
    }
    /**
     * Close a replay worker's history pusher stream.
     *
     * Hidden in the docs because it is only meant to be used internally by the Worker.
     *
     * @hidden
     */
    closeHistoryStream(pusher) {
        core_bridge_1.native.closeHistoryStream(pusher);
    }
    /**
     * Deregister a Worker, if this is the last registered Worker or Client, shutdown the core and unset the singleton instance
     *
     * Hidden in the docs because it is only meant to be used internally by the Worker.
     * @hidden
     */
    async deregisterWorker(worker) {
        try {
            await core_bridge_1.native.workerFinalizeShutdown(worker);
        }
        finally {
            this.backRefs.delete(worker);
            await this.shutdownIfIdle();
        }
    }
    /**
     * Create an ephemeral Temporal server.
     *
     * Hidden since it is meant to be used internally by the testing framework.
     * @hidden
     */
    async createEphemeralServer(options) {
        return await this.createNative(core_bridge_1.native.newEphemeralServer, this.native, options);
    }
    /**
     * Shut down an ephemeral Temporal server.
     *
     * Hidden since it is meant to be used internally by the testing framework.
     * @hidden
     */
    async shutdownEphemeralServer(server) {
        await core_bridge_1.native.ephemeralServerShutdown(server);
        this.backRefs.delete(server);
        await this.shutdownIfIdle();
    }
    async createNative(f, ...args) {
        return this.createNativeNoBackRef(async () => {
            const ref = await f(...args);
            this.backRefs.add(ref);
            return ref;
        });
    }
    async createNativeNoBackRef(f, ...args) {
        this.pendingCreations++;
        try {
            try {
                return await f(...args);
            }
            finally {
                this.pendingCreations--;
            }
        }
        catch (err) {
            // Attempt to shutdown the runtime in case there's an error creating the
            // native object to avoid leaving an idle Runtime.
            await this.shutdownIfIdle();
            throw err;
        }
    }
    isIdle() {
        return this.pendingCreations === 0 && this.backRefs.size === 0;
    }
    async shutdownIfIdle() {
        if (this.isIdle())
            await this.shutdown();
    }
    /**
     * Shutdown and unset the singleton instance.
     *
     * If the runtime is polling on Core logs, wait for those logs to be collected.
     *
     * @hidden
     * @internal
     */
    async shutdown() {
        if (this.native === undefined)
            return;
        try {
            if (Runtime._instance === this)
                delete Runtime._instance;
            this.metricMeter = common_1.noopMetricMeter;
            if (this.metricsBuffer !== undefined) {
                this.metricsBuffer.unbind(this);
                this.metricsBuffer = undefined;
            }
            this.teardownShutdownHook();
            // FIXME(JWH): I think we no longer need this, but will have to thoroughly validate.
            core_bridge_1.native.runtimeShutdown(this.native);
            if ((0, logger_1.isFlushableLogger)(this.logger)) {
                this.logger.close?.();
            }
        }
        finally {
            delete this.native;
        }
    }
    /**
     * Used by Workers to register for shutdown signals
     *
     * @hidden
     * @internal
     */
    registerShutdownSignalCallback(callback) {
        if (this.state === 'RUNNING') {
            this.shutdownSignalCallbacks.add(callback);
        }
        else {
            queueMicrotask(callback);
        }
    }
    /**
     * Used by Workers to deregister handlers registered with {@link registerShutdownSignalCallback}
     *
     * @hidden
     * @internal
     */
    deregisterShutdownSignalCallback(callback) {
        this.shutdownSignalCallbacks.delete(callback);
    }
    /**
     * Set up the shutdown hook, listen on shutdownSignals
     */
    setupShutdownHook() {
        for (const signal of this.options.shutdownSignals) {
            process.on(signal, this.startShutdownSequence);
        }
    }
    /**
     * Stop listening on shutdownSignals
     */
    teardownShutdownHook() {
        for (const signal of this.options.shutdownSignals) {
            process.off(signal, this.startShutdownSequence);
        }
    }
    /**
     * Bound to `this` for use with `process.on` and `process.off`
     */
    startShutdownSequence = () => {
        this.state = 'SHUTTING_DOWN';
        this.teardownShutdownHook();
        for (const callback of this.shutdownSignalCallbacks) {
            queueMicrotask(callback); // Run later
            this.deregisterShutdownSignalCallback(callback);
        }
    };
    checkHeapSizeLimit() {
        if (process.platform === 'linux') {
            // References:
            // - https://facebookmicrosites.github.io/cgroup2/docs/memory-controller.html
            // - https://www.kernel.org/doc/Documentation/cgroup-v1/memory.txt
            const cgroupMemoryConstraint = this.tryReadNumberFileSync(/* cgroup v2 */ '/sys/fs/cgroup/memory.high') ??
                this.tryReadNumberFileSync(/* cgroup v2 */ '/sys/fs/cgroup/memory.max') ??
                this.tryReadNumberFileSync(/* cgroup v1 */ '/sys/fs/cgroup/memory/memory.limit_in_bytes');
            const cgroupMemoryReservation = this.tryReadNumberFileSync(/* cgroup v2 */ '/sys/fs/cgroup/memory.low') ??
                this.tryReadNumberFileSync(/* cgroup v2 */ '/sys/fs/cgroup/memory.min') ??
                this.tryReadNumberFileSync(/* cgroup v1 */ '/sys/fs/cgroup/memory/soft_limit_in_bytes');
            const applicableMemoryConstraint = cgroupMemoryReservation ?? cgroupMemoryConstraint;
            if (applicableMemoryConstraint &&
                applicableMemoryConstraint < os.totalmem() &&
                applicableMemoryConstraint < v8.getHeapStatistics().heap_size_limit) {
                let dockerArgs = '';
                if (cgroupMemoryConstraint) {
                    dockerArgs += `--memory=${(0, utils_1.toMB)(cgroupMemoryConstraint, 0)}m `;
                }
                if (cgroupMemoryReservation) {
                    dockerArgs += `--memory-reservation=${(0, utils_1.toMB)(cgroupMemoryReservation, 0)}m `;
                }
                const suggestedOldSpaceSizeInMb = (0, utils_1.toMB)(applicableMemoryConstraint * 0.75, 0);
                this.logger.warn(`This program is running inside a containerized environment with a memory constraint ` +
                    `(eg. '${dockerArgs}' or similar). Node itself does not consider this memory constraint ` +
                    `in how it manages its heap memory. There is consequently a high probability that ` +
                    `the process will crash due to running out of memory. To increase reliability, we recommend ` +
                    `adding '--max-old-space-size=${suggestedOldSpaceSizeInMb}' to your node arguments. ` +
                    `Refer to https://docs.temporal.io/develop/typescript/core-application#run-a-worker-on-docker ` +
                    `for more advice on tuning your Workers.`, { sdkComponent: common_1.SdkComponent.worker });
            }
        }
    }
    tryReadNumberFileSync(file) {
        try {
            const val = Number(fs.readFileSync(file, { encoding: 'ascii' }));
            return isNaN(val) ? undefined : val;
        }
        catch (_e) {
            return undefined;
        }
    }
}
exports.Runtime = Runtime;
//# sourceMappingURL=runtime.js.map