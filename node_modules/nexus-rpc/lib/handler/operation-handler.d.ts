import { HandlerStartOperationResult } from "./start-operation-result";
import { CancelOperationContext, StartOperationContext } from "./operation-context";
import { OperationDefinition, OperationInput, OperationKey, OperationMap, OperationOutput } from "../service";
/**
 * A handler for a Nexus operation.
 *
 * This interface is meant to be implemented by Nexus service implementors.
 *
 * @experimental
 */
export interface OperationHandler<I, O> {
    /**
     * Handle requests to start an operation.
     *
     * Return {@link HandlerStartOperationResultSync} to respond successfully inline, or
     * {@link HandlerStartOperationResultAsync} to indicate that an asynchronous operation was started.
     * Throw an {@link OperationError} to indicate that an operation completed as failed or canceled.
     */
    start(ctx: StartOperationContext, input: I): Promise<HandlerStartOperationResult<O>>;
    /**
     * Handle requests to cancel an asynchronous operation.
     *
     * Cancelation of a Nexus operation is:
     * 1. _asynchronous_ - returning from this method only confirms that cancelation was notified;
     *    the implementation may however choose to process the cancellation at a later time, or to
     *    ignore it entirely.
     * 2. _idempotent_ - implementations must ignore duplicate cancelations for the same operation.
     */
    cancel(ctx: CancelOperationContext, token: string): Promise<void>;
}
/**
 * A shortcut for defining an operation handler that only implements the {@link OperationHandler.start}
 * method and always returns a {@link HandlerStartOperationResultSync}.
 *
 * @experimental
 */
export type SyncOperationHandler<I, O> = (ctx: StartOperationContext, input: I) => Promise<O>;
/**
 * Compiles an operation handler into a {@link CompiledOperationHandler}. A compiled operation
 * handler is a single object that is both an operation definition and a full-fledged operation
 * handler for that operation.
 *
 * @hidden
 * @internal
 */
export declare function compileOperationHandler<I, O>(definition: OperationDefinition<I, O>, handler: OperationHandler<I, O> | SyncOperationHandler<I, O> | undefined): CompiledOperationHandler<I, O>;
/**
 * A compiled operation handler is a single object that is both an operation definition and a
 * full-fledged operation handler for that operation.
 *
 * @hidden
 * @internal
 * @experimental
 */
export type CompiledOperationHandler<I, O> = OperationDefinition<I, O> & OperationHandler<I, O>;
/**
 * @internal
 * @hidden
 */
export type CompiledOperationHandlerFor<Ops extends OperationMap> = CompiledOperationHandler<OperationInput<Ops[OperationKey<Ops>]>, OperationOutput<Ops[OperationKey<Ops>]>>;
