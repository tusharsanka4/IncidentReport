import type { temporal } from '@temporalio/proto';
import type { PayloadConverter } from './converter/payload-converter';
import type { SerializationContext } from './converter/serialization-context';
/**
 * User metadata that can be attached to workflow commands.
 */
export interface UserMetadata {
    /** A fixed, single line summary of the command's purpose */
    staticSummary?: string;
    /** Fixed additional details about the command for longer-text description, can span multiple lines */
    staticDetails?: string;
}
export declare function userMetadataToPayload(payloadConverter: PayloadConverter, staticSummary: string | undefined, staticDetails: string | undefined, context?: SerializationContext): temporal.api.sdk.v1.IUserMetadata | undefined;
