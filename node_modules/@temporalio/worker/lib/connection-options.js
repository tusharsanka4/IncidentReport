"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNativeClientOptions = toNativeClientOptions;
const time_1 = require("@temporalio/common/lib/time");
const internal_non_workflow_1 = require("@temporalio/common/lib/internal-non-workflow");
const pkg_1 = __importDefault(require("./pkg"));
/**
 * Default warning threshold, in bytes, for outbound payload-bearing field size.
 * Mirrors the Temporal server's `limit.blobSize.warn` dynamic-config default.
 */
const DEFAULT_PAYLOADS_WARN_SIZE = 512 * 1024;
/**
 * Default warning threshold, in bytes, for outbound memo size.
 * Mirrors the Temporal server's `limit.memoSize.warn` dynamic-config default.
 */
const DEFAULT_MEMO_WARN_SIZE = 2 * 1024;
/**
 * The default Temporal Server's TCP port for public gRPC connections.
 */
const DEFAULT_TEMPORAL_GRPC_PORT = 7233;
// Compile to Native ///////////////////////////////////////////////////////////////////////////////
function toNativeClientOptions(options) {
    const address = (0, internal_non_workflow_1.normalizeGrpcEndpointAddress)(options.address ?? 'localhost:7233', DEFAULT_TEMPORAL_GRPC_PORT);
    const tlsInput = (0, internal_non_workflow_1.normalizeTlsConfig)(options.tls, options.apiKey);
    const tls = tlsInput
        ? {
            domain: tlsInput.serverNameOverride ?? null,
            serverRootCaCert: tlsInput.serverRootCACertificate ? Buffer.from(tlsInput.serverRootCACertificate) : null,
            clientTlsOptions: tlsInput.clientCertPair
                ? {
                    clientCert: tlsInput.clientCertPair.crt && Buffer.from(tlsInput.clientCertPair.crt),
                    clientPrivateKey: tlsInput.clientCertPair.key && Buffer.from(tlsInput.clientCertPair.key),
                }
                : null,
        }
        : null;
    let httpConnectProxy = null;
    if (options.proxy?.targetHost) {
        const { targetHost: target } = options.proxy;
        const { hostname: host, port } = (0, internal_non_workflow_1.parseHttpConnectProxyAddress)(target);
        const basicAuth = options.proxy.basicAuth
            ? {
                username: options.proxy.basicAuth.username,
                password: options.proxy.basicAuth.password,
            }
            : null;
        httpConnectProxy = {
            targetHost: (0, internal_non_workflow_1.joinProtoHostPort)({ hostname: host, port }),
            basicAuth,
        };
    }
    const dnsLoadBalancingConfig = options.dnsLoadBalancingConfig
        ? {
            resolutionIntervalMillis: (0, time_1.msToNumber)(options.dnsLoadBalancingConfig.resolutionInterval),
        }
        : null;
    const grpcCompression = options.grpcCompression ?? { codec: 'gzip' };
    switch (grpcCompression.codec) {
        case 'gzip':
        case 'none':
            break;
        default:
            throw new TypeError(`Unsupported gRPC compression codec: ${grpcCompression.codec}`);
    }
    if (options?.apiKey && options.metadata?.['Authorization']) {
        throw new TypeError('Both `apiKey` option and `Authorization` header were provided. Only one makes sense to use at a time.');
    }
    let headers = null;
    if (options.metadata) {
        headers = {};
        for (const [key, value] of Object.entries(options.metadata)) {
            if (typeof value === 'string') {
                headers[key] = { type: 'ascii', value };
            }
            else {
                headers[key] = { type: 'binary', value };
            }
        }
    }
    return {
        targetUrl: tls ? `https://${address}` : `http://${address}`,
        clientName: 'temporal-typescript',
        clientVersion: pkg_1.default.version,
        tls,
        httpConnectProxy,
        dnsLoadBalancingConfig,
        grpcCompression,
        headers,
        apiKey: options.apiKey ?? null,
        disableErrorCodeMetricTags: options.disableErrorCodeMetricTags ?? false,
        payloadsWarnSize: options.payloadLimits?.payloadsWarnSize ?? DEFAULT_PAYLOADS_WARN_SIZE,
        memoWarnSize: options.payloadLimits?.memoWarnSize ?? DEFAULT_MEMO_WARN_SIZE,
    };
}
//# sourceMappingURL=connection-options.js.map