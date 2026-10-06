"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalNativeConnection = exports.NativeConnection = void 0;
exports.extractNativeClient = extractNativeClient;
exports.extractReferenceHolders = extractReferenceHolders;
const node_async_hooks_1 = require("node:async_hooks");
const common_1 = require("@temporalio/common");
const core_bridge_1 = require("@temporalio/core-bridge");
const client_1 = require("@temporalio/client");
const connection_1 = require("@temporalio/client/lib/connection");
const errors_1 = require("./errors");
const runtime_1 = require("./runtime");
/**
 * A Native Connection object that delegates calls to the Rust Core binary extension.
 *
 * A Worker must use this class to connect to the server.
 *
 * This class can be used to power `@temporalio/client`'s Client objects.
 */
class NativeConnection {
    runtime;
    nativeClient;
    enableTestService;
    plugins;
    /**
     * referenceHolders is used internally by the framework, it can be accessed with `extractReferenceHolders` (below)
     */
    referenceHolders = new Set();
    /**
     * Raw gRPC access to Temporal Server's {@link
     * https://github.com/temporalio/api/blob/main/temporal/api/workflowservice/v1/service.proto | Workflow service}
     */
    workflowService;
    /**
     * Raw gRPC access to Temporal Server's
     * {@link https://github.com/temporalio/api/blob/main/temporal/api/operatorservice/v1/service.proto | Operator service}
     *
     * The Operator Service API defines how Temporal SDKs and other clients interact with the Temporal
     * server to perform administrative functions like registering a search attribute or a namespace.
     *
     * This Service API is NOT compatible with Temporal Cloud. Attempt to use it against a Temporal
     * Cloud namespace will result in gRPC `unauthorized` error.
     */
    operatorService;
    /**
     * Raw gRPC access to the standard gRPC {@link https://github.com/grpc/grpc/blob/92f58c18a8da2728f571138c37760a721c8915a2/doc/health-checking.md | health service}.
     */
    healthService;
    /**
     * Raw gRPC access to Temporal Server's
     * {@link https://github.com/temporalio/api/blob/main/temporal/api/testservice/v1/service.proto | Test service}
     *
     * Will be `undefined` if connected to a server that does not support the test service.
     */
    testService;
    callContextStorage = new node_async_hooks_1.AsyncLocalStorage();
    /**
     * nativeClient is intentionally left private, framework code can access it with `extractNativeClient` (below)
     */
    constructor(runtime, nativeClient, enableTestService, plugins) {
        this.runtime = runtime;
        this.nativeClient = nativeClient;
        this.enableTestService = enableTestService;
        this.plugins = plugins;
        this.workflowService = client_1.WorkflowService.create(this.sendRequest.bind(this, core_bridge_1.native.clientSendWorkflowServiceRequest.bind(undefined, this.nativeClient)), false, false);
        this.operatorService = client_1.OperatorService.create(this.sendRequest.bind(this, core_bridge_1.native.clientSendOperatorServiceRequest.bind(undefined, this.nativeClient)), false, false);
        this.healthService = client_1.HealthService.create(this.sendRequest.bind(this, core_bridge_1.native.clientSendHealthServiceRequest.bind(undefined, this.nativeClient)), false, false);
        if (this.enableTestService) {
            this.testService = client_1.TestService.create(this.sendRequest.bind(this, core_bridge_1.native.clientSendTestServiceRequest.bind(undefined, this.nativeClient)), false, false);
        }
        // Set internal capability flag - not part of public API
        Object.defineProperty(this, client_1.InternalConnectionLikeSymbol, {
            value: { supportsEagerStart: true },
            writable: false,
            enumerable: false,
            configurable: false,
        });
    }
    /**
     * No-op. This class can only be created via eager connection.
     */
    async ensureConnected() { }
    sendRequest(sendRequestNative, method, requestData, callback) {
        if (!isProtoMethod(method)) {
            throw new TypeError(`Invalid request method, expected a proto.Method instance: ${method.name}`);
        }
        const { resolvedResponseType } = method;
        if (resolvedResponseType == null) {
            throw new TypeError(`Invalid request method: ${method.name}`);
        }
        // TODO: add support for abortSignal
        const ctx = this.callContextStorage.getStore() ?? {};
        const metadata = ctx.metadata != null ? tagMetadata(ctx.metadata) : {};
        const req = {
            rpc: method.name,
            req: requestData,
            retry: true,
            metadata,
            timeout: ctx.deadline ? getRelativeTimeout(ctx.deadline) : null,
        };
        sendRequestNative(req).then((res) => {
            callback(null, resolvedResponseType.decode(Buffer.from(res)));
        }, (err) => {
            callback(err);
        });
    }
    /**
     * Set a deadline for any service requests executed in `fn`'s scope.
     *
     * The deadline is a point in time after which any pending gRPC request will be considered as failed;
     * this will locally result in the request call throwing a {@link grpc.ServiceError|ServiceError}
     * with code {@link grpc.status.DEADLINE_EXCEEDED|DEADLINE_EXCEEDED}; see {@link isGrpcDeadlineError}.
     *
     * It is stronly recommended to explicitly set deadlines. If no deadline is set, then it is
     * possible for the client to end up waiting forever for a response.
     *
     * @param deadline a point in time after which the request will be considered as failed; either a
     *                 Date object, or a number of milliseconds since the Unix epoch (UTC).
     * @returns the value returned from `fn`
     *
     * @see https://grpc.io/docs/guides/deadlines/
     */
    async withDeadline(deadline, fn) {
        const cc = this.callContextStorage.getStore();
        return await this.callContextStorage.run({ ...cc, deadline }, fn);
    }
    /**
     * Set metadata for any service requests executed in `fn`'s scope.
     *
     * The provided metadata is merged on top of any existing metadata in current scope, including metadata provided in
     * {@link NativeConnectionOptions.metadata}.
     *
     * @returns value returned from `fn`
     *
     * @example
     *
     * ```ts
     * const workflowHandle = await conn.withMetadata({ apiKey: 'secret' }, () =>
     *   conn.withMetadata({ otherKey: 'set' }, () => client.start(options)))
     * );
     * ```
     */
    async withMetadata(metadata, fn) {
        const cc = this.callContextStorage.getStore();
        return await this.callContextStorage.run({
            ...cc,
            metadata: { ...cc?.metadata, ...metadata },
        }, fn);
    }
    /**
     * Set an {@link AbortSignal} that, when aborted, cancels any ongoing service requests executed in
     * `fn`'s scope. This will locally result in the request call throwing a {@link grpc.ServiceError|ServiceError}
     * with code {@link grpc.status.CANCELLED|CANCELLED}; see {@link isGrpcCancelledError}.
     *
     * This method is only a convenience wrapper around {@link NativeConnection.withAbortSignal}.
     *
     * @example
     *
     * ```ts
     * const ctrl = new AbortController();
     * setTimeout(() => ctrl.abort(), 10_000);
     * // 👇 throws if incomplete by the timeout.
     * await conn.withAbortSignal(ctrl.signal, () => client.workflow.execute(myWorkflow, options));
     * ```
     *
     * @returns value returned from `fn`
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
     */
    async withAbortSignal(abortSignal, fn) {
        const cc = this.callContextStorage.getStore();
        return await this.callContextStorage.run({ ...cc, abortSignal }, fn);
    }
    /**
     * @deprecated use `connect` instead
     */
    static async create(options) {
        return this.connect(options);
    }
    /**
     * Eagerly connect to the Temporal server and return a NativeConnection instance
     */
    static async connect(options) {
        options = options ?? {};
        for (const plugin of options.plugins ?? []) {
            if (plugin.configureNativeConnection !== undefined) {
                options = plugin.configureNativeConnection(options);
            }
        }
        const internalOptions = options?.[connection_1.InternalConnectionOptionsSymbol] ?? {};
        const enableTestService = internalOptions.supportsTestService ?? false;
        try {
            const runtime = runtime_1.Runtime.instance();
            const client = await runtime.createNativeClient(options);
            return new this(runtime, client, enableTestService, options.plugins ?? []);
        }
        catch (err) {
            if (err instanceof errors_1.TransportError) {
                throw new errors_1.TransportError(err.message);
            }
            throw err;
        }
    }
    /**
     * Close this connection.
     *
     * Make sure any Workers using this connection are stopped before calling
     * this method or it will throw an {@link IllegalStateError}
     */
    async close() {
        if (this.referenceHolders.size > 0) {
            throw new common_1.IllegalStateError('Cannot close connection while Workers hold a reference to it');
        }
        await this.runtime.closeNativeClient(this.nativeClient);
    }
    /**
     * Mapping of gRPC metadata (HTTP headers) to send with each request to the server.
     *
     * Use {@link NativeConnectionOptions.metadata} to set the initial metadata for client creation.
     */
    async setMetadata(metadata) {
        core_bridge_1.native.clientUpdateHeaders(this.nativeClient, tagMetadata(metadata));
    }
    /**
     * Update the API key for this client. This is only set if `metadata` doesn't already have an
     * "authorization" key.
     *
     * Use {@link NativeConnectionOptions.apiKey} to set the initial metadata for client creation.
     */
    async setApiKey(apiKey) {
        core_bridge_1.native.clientUpdateApiKey(this.nativeClient, apiKey);
    }
}
exports.NativeConnection = NativeConnection;
/**
 * Extract the private native client instance from a `NativeConnection` instance.
 *
 * Only meant to be used by the framework.
 */
function extractNativeClient(conn) {
    return conn.nativeClient;
}
/**
 * Extract the private referenceHolders set from a `NativeConnection` instance.
 *
 * Only meant to be used by the framework.
 */
function extractReferenceHolders(conn) {
    return conn.referenceHolders;
}
/**
 * Internal class used when a Worker directly instantiates a connection with no external references.
 *
 * This class is only used as a "marker" during Worker shutdown to decide whether to close the connection.
 */
class InternalNativeConnection extends NativeConnection {
}
exports.InternalNativeConnection = InternalNativeConnection;
function isProtoMethod(method) {
    return 'resolvedResponseType' in method;
}
/**
 * See https://nodejs.org/api/timers.html#settimeoutcallback-delay-args
 * In particular, "When delay is larger than 2147483647 or less than 1, the
 * delay will be set to 1. Non-integer delays are truncated to an integer."
 * This number of milliseconds is almost 25 days.
 *
 * Copied from the grpc-js source code.
 */
const MAX_TIMEOUT_TIME = 2147483647;
/**
 * Get the timeout value that should be passed to setTimeout now for the timer
 * to end at the deadline. For any deadline before now, the timer should end
 * immediately, represented by a value of 0. For any deadline more than
 * MAX_TIMEOUT_TIME milliseconds in the future, a timer cannot be set that will
 * end at that time, so it is treated as infinitely far in the future.
 *
 * Copied from the grpc-js source code.
 */
function getRelativeTimeout(deadline) {
    const deadlineMs = deadline instanceof Date ? deadline.getTime() : deadline;
    const now = new Date().getTime();
    const timeout = deadlineMs - now;
    if (timeout < 0) {
        return 0;
    }
    else if (timeout > MAX_TIMEOUT_TIME) {
        return Infinity;
    }
    else {
        return timeout;
    }
}
function tagMetadata(metadata) {
    return Object.fromEntries(Object.entries(metadata).map(([k, value]) => [
        k,
        typeof value === 'string' ? { type: 'ascii', value } : { type: 'binary', value },
    ]));
}
//# sourceMappingURL=connection.js.map