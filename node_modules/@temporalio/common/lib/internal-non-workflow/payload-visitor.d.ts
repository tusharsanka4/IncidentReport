import type { WalkEnv } from '@temporalio/proto/lib/payload-visitor.generated';
import { type ConcurrencyLimit } from '../concurrency/limit';
import type { Payload } from '../interfaces';
/**
 * Called for each singular (or map-value) payload-bearing field. One payload in, one out.
 *
 * @internal
 * @experimental
 */
export type PayloadTransform<Ctx> = (payload: Payload, context: Ctx, abortSignal?: AbortSignal) => Promise<Payload>;
/**
 * Called for each payload-bearing field that may contain multiple payloads (e.g. Payloads or repeated fields).
 * May return any number of payloads, including zero.
 *
 * @internal
 * @experimental
 */
export type PayloadsTransform<Ctx> = (payloads: Payload[], context: Ctx, abortSignal?: AbortSignal) => Promise<Payload[]>;
/**
 * Called on entering each message and returns the context for its children.
 *
 * @internal
 * @experimental
 */
export type ContextDeriver<Ctx> = (message: object, typeName: string, context: Ctx) => Ctx;
/**
 * Two transform functions are required because some fields require a single (non-null) payload while others
 * are simply lists.
 *
 * @internal
 * @experimental
 */
export interface VisitOptions<Ctx> {
    transformPayload: PayloadTransform<Ctx>;
    transformPayloads: PayloadsTransform<Ctx>;
    deriveContext?: ContextDeriver<Ctx>;
    /** Context in scope before any message is entered. */
    initialContext?: Ctx;
    /**
     * Optional concurrency limit applied to every transform call. Share one limit across visits for a
     * global cap (e.g. a payload store's total budget), or nest limits to compose a per-visit cap under
     * a global one. Omit to run transforms one at a time (sequential).
     */
    limit?: ConcurrencyLimit;
    skipHeaders?: boolean;
    skipSearchAttributes?: boolean;
    /** Aborts the walk; composed with the internal cancel-on-error signal and handed to the transform. */
    abortSignal?: AbortSignal;
}
/**
 * Applies the payload transforms to every {@link Payload} in `root`, mutating it in place. Pass the
 * generated `walk*` function for the root's message type (all are re-exported below).
 *
 * @internal
 * @experimental
 */
export declare function visit<Root, Ctx = void>(root: Root, walk: (root: Root, env: WalkEnv<Ctx>, context: Ctx) => Promise<unknown>[], options: VisitOptions<Ctx>): Promise<void>;
export * from '@temporalio/proto/lib/payload-visitor.generated';
