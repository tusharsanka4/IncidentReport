import type { native } from '@temporalio/core-bridge';
import type { Duration } from '@temporalio/common/lib/time';
import { ProxyConfig, TLSConfig } from '@temporalio/common/lib/internal-non-workflow';
import type { Metadata } from '@temporalio/client';
import type { NativeConnectionPlugin } from './connection';
export { TLSConfig, ProxyConfig };
/**
 * DNS load balancing configuration.
 */
export interface DNSLoadBalancingConfig {
    /**
     * How often Core should re-resolve DNS records for the target host.
     */
    resolutionInterval: Duration;
}
/**
 * Use gzip for transport-level gRPC compression.
 */
export interface GzipGrpcCompressionConfig {
    codec: 'gzip';
}
/**
 * Disable transport-level gRPC compression.
 */
export interface NoneGrpcCompressionConfig {
    codec: 'none';
}
/**
 * Transport-level gRPC compression configuration.
 */
export type GrpcCompressionConfig = GzipGrpcCompressionConfig | NoneGrpcCompressionConfig;
/**
 * Payload size-limit configuration for a connection.
 *
 * @experimental Payload size-limit enforcement is an experimental feature; APIs may change without notice.
 */
export interface PayloadLimitsConfig {
    /**
     * Warning threshold, in bytes, for the size of an outbound payload-bearing field. Over-threshold
     * fields are logged but still sent to the server. Set to `0` to disable.
     *
     * @default 512KiB
     */
    payloadsWarnSize?: number;
    /**
     * Warning threshold, in bytes, for outbound memo size. Over-threshold memos are logged but still
     * sent to the server. Set to `0` to disable.
     *
     * @default 2KiB
     */
    memoWarnSize?: number;
}
export interface NativeConnectionOptions {
    /**
     * The address of the Temporal server to connect to, in `hostname:port` format.
     *
     * Port defaults to 7233. Raw IPv6 addresses must be wrapped in square brackets (e.g. `[ipv6]:port`).
     *
     * @default localhost:7233
     */
    address?: string;
    /**
     * TLS configuration options.
     *
     * Pass a falsy value to use a non-encrypted connection or `true` or `{}` to
     * connect with TLS without any customization.
     */
    tls?: TLSConfig | boolean | null;
    /**
     * Proxying configuration.
     */
    proxy?: ProxyConfig;
    /**
     * DNS load balancing configuration.
     *
     * When set, Core periodically re-resolves the target host's DNS records and
     * round-robins requests across the resolved addresses.
     *
     * Disabled by default. If {@link proxy} is also set, Core DNS load balancing
     * is disabled because the two options are mutually exclusive.
     */
    dnsLoadBalancingConfig?: DNSLoadBalancingConfig | null;
    /**
     * Transport-level gRPC compression configuration for Core service requests.
     *
     * Defaults to gzip, which compresses outbound request bodies and accepts
     * gzip-compressed responses. Set to `{ codec: 'none' }` to opt out.
     */
    grpcCompression?: GrpcCompressionConfig;
    /**
     * Optional mapping of gRPC metadata (HTTP headers) to send with each request to the server.
     *
     * Set statically at connection time, can be replaced later using {@link NativeConnection.setMetadata}.
     */
    metadata?: Metadata;
    /**
     * API key for Temporal. This becomes the "Authorization" HTTP header with "Bearer " prepended.
     * This is only set if RPC metadata doesn't already have an "authorization" key.
     */
    apiKey?: string;
    /**
     * If set to true, error code labels will not be included on request failure
     * metrics emitted by this Client.
     *
     * @default false
     */
    disableErrorCodeMetricTags?: boolean;
    /**
     * Payload size-limit options for this connection. If unset, defaults of 512KiB (payloads) and
     * 2KiB (memo) are used.
     *
     * @experimental Payload size-limit enforcement is an experimental feature; APIs may change without notice.
     */
    payloadLimits?: PayloadLimitsConfig;
    /**
     * List of plugins to register with the native connection.
     *
     * Plugins allow you to configure the native connection options.
     *
     * Any plugins provided will also be passed to any Worker, Client, or Bundler built from this connection.
     *
     * @experimental Plugins is an experimental feature; APIs may change without notice.
     */
    plugins?: NativeConnectionPlugin[];
}
export declare function toNativeClientOptions(options: NativeConnectionOptions): native.ClientOptions;
