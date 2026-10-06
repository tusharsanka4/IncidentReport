"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trigger = void 0;
const cancellation_scope_1 = require("./cancellation-scope");
const stack_helpers_1 = require("./stack-helpers");
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
class Trigger {
    // Typescript does not realize that the promise executor is run synchronously in the constructor
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    resolve;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    reject;
    promise;
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            const scope = cancellation_scope_1.CancellationScope.current();
            if (scope.cancellable) {
                (0, stack_helpers_1.untrackPromise)(scope.cancelRequested.catch(reject));
            }
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.resolve = resolve;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.reject = reject;
        });
        // Avoid unhandled rejections
        (0, stack_helpers_1.untrackPromise)(this.promise.catch(() => undefined));
    }
    then(onfulfilled, onrejected) {
        return this.promise.then(onfulfilled, onrejected);
    }
}
exports.Trigger = Trigger;
//# sourceMappingURL=trigger.js.map