/**
 * A `PromiseLike` helper which exposes its `resolve` and `reject` methods.
 *
 * Trigger is CancellationScope-aware: it is linked to the current scope on
 * construction and throws when that scope is cancelled.
 *
 * Useful for e.g. waiting for unblocking a Workflow from a Signal.
 *
 * @example
 * ```ts
 * import { defineSignal, setHandler, sleep, Trigger } from '@temporalio/workflow';
 *
 * const completeUserInteraction = defineSignal('completeUserInteraction');
 *
 * export async function waitOnUser(userId: string): Promise<void> {
 *   const userInteraction = new Trigger<boolean>();
 *
 *   // programmatically resolve Trigger
 *   setHandler(completeUserInteraction, () => userInteraction.resolve(true));
 *
 *   const userInteracted = await Promise.race([userInteraction, sleep('30 days')]);
 *   if (!userInteracted) {
 *     await sendReminderEmail(userId);
 *   }
 * }
 * ```
 */
export declare class Trigger<T> implements PromiseLike<T> {
    readonly resolve: (value: T | PromiseLike<T>) => void;
    readonly reject: (reason?: any) => void;
    protected readonly promise: Promise<T>;
    constructor();
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2>;
}
