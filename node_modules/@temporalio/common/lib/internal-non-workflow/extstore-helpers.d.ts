import type { Payload } from '../interfaces';
import type { StorageDriverClaim } from '../converter/extstore';
/**
 * True if the payload is an External Storage reference:
 * `temporal.api.sdk.v1.ExternalStorageReference`.
 *
 * @internal
 * @experimental
 */
export declare function isReferencePayload(payload: Payload): boolean;
/**
 * Parsed contents of a reference payload.
 *
 * @internal
 * @experimental
 */
export interface DecodedReferencePayload {
    driverName: string;
    claimData: Record<string, string>;
    sizeBytes: number;
}
/**
 * Decode a reference payload from the wire format {@link ExternalStorageReference}.
 * Throws {@link ValueError} if the payload is not a reference or is malformed.
 * Callers should gate on {@link isReferencePayload} first.
 *
 * @internal
 * @experimental
 */
export declare function decodeReferencePayload(payload: Payload): DecodedReferencePayload;
/**
 * Encode a reference payload to wire format.
 *
 * @internal
 * @experimental
 */
export declare function encodeReferencePayload({ driverName, claim, sizeBytes, }: {
    driverName: string;
    claim: StorageDriverClaim;
    sizeBytes: number;
}): Payload;
