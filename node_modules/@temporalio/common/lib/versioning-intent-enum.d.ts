import type { VersioningIntent as VersioningIntentString } from './versioning-intent';
/**
 * Protobuf enum representation of {@link VersioningIntentString}.
 *
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export declare enum VersioningIntent {
    UNSPECIFIED = 0,
    COMPATIBLE = 1,
    DEFAULT = 2
}
/**
 * @deprecated Worker Versioning is now deprecated. Please use the Worker Deployment API instead: https://docs.temporal.io/worker-deployments
 */
export declare function versioningIntentToProto(intent: VersioningIntentString | undefined): VersioningIntent;
