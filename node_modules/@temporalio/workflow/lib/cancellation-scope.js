"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RootCancellationScope = exports.CancellationScope = exports.AsyncLocalStorage = void 0;
exports.registerSleepImplementation = registerSleepImplementation;
const common_1 = require("@temporalio/common");
const time_1 = require("@temporalio/common/lib/time");
const stack_helpers_1 = require("./stack-helpers");
const global_attributes_1 = require("./global-attributes");
const flags_1 = require("./flags");
// AsyncLocalStorage is injected via vm module into global scope.
// In case Workflow code is imported in Node.js context, replace with an empty class.
exports.AsyncLocalStorage = globalThis.AsyncLocalStorage ?? class {
};
/** Magic symbol used to create the root scope - intentionally not exported */
const NO_PARENT = Symbol('NO_PARENT');
/**
 * Cancellation Scopes provide the mechanic by which a Workflow may gracefully handle incoming requests for cancellation
 * (e.g. in response to {@link WorkflowHandle.cancel} or through the UI or CLI), as well as request cancellation of
 * cancellable operations it owns (e.g. Activities, Timers, Child Workflows, etc).
 *
 * Cancellation Scopes form a tree, with the Workflow's main function running in the root scope of that tree.
 * By default, cancellation propagates down from a parent scope to its children and its cancellable operations.
 * A non-cancellable scope can receive cancellation requests, but is never effectively considered as cancelled,
 * thus shieldding its children and cancellable operations from propagation of cancellation requests it receives.
 *
 * Scopes are created using the `CancellationScope` constructor or the static helper methods {@link cancellable},
 * {@link nonCancellable} and {@link withTimeout}. `withTimeout` creates a scope that automatically cancels itself after
 * some duration.
 *
 * Cancellation of a cancellable scope results in all operations created directly in that scope to throw a
 * {@link CancelledFailure} (either directly, or as the `cause` of an {@link ActivityFailure} or a
 * {@link ChildWorkflowFailure}). Further attempt to create new cancellable scopes or cancellable operations within a
 * scope that has already been cancelled will also immediately throw a {@link CancelledFailure} exception. It is however
 * possible to create a non-cancellable scope at that point; this is often used to execute rollback or cleanup
 * operations. For example:
 *
 * ```ts
 * async function myWorkflow(...): Promise<void> {
 *   try {
 *     // This activity runs in the root cancellation scope. Therefore, a cancellation request on
 *     // the Workflow execution (e.g. through the UI or CLI) automatically propagates to this
 *     // activity. Assuming that the activity properly handle the cancellation request, then the
 *     // call below will throw an `ActivityFailure` exception, with `cause` sets to an
 *     // instance of `CancelledFailure`.
 *     await someActivity();
 *   } catch (e) {
 *     if (isCancellation(e)) {
 *       // Run cleanup activity in a non-cancellable scope
 *       await CancellationScope.nonCancellable(async () => {
 *         await cleanupActivity();
 *       }
 *     } else {
 *       throw e;
 *     }
 *   }
 * }
 * ```
 *
 * A cancellable scope may be programatically cancelled by calling {@link cancel|`scope.cancel()`}`. This may be used,
 * for example, to explicitly request cancellation of an Activity or Child Workflow:
 *
 * ```ts
 * const cancellableActivityScope = new CancellationScope();
 * const activityPromise = cancellableActivityScope.run(() => someActivity());
 * cancellableActivityScope.cancel(); // Cancels the activity
 * await activityPromise; // Throws `ActivityFailure` with `cause` set to `CancelledFailure`
 * ```
 */
class CancellationScope {
    /**
     * Time in milliseconds before the scope cancellation is automatically requested
     */
    timeout;
    /**
     * If false, then this scope will never be considered cancelled, even if a cancellation request is received (either
     * directly by calling `scope.cancel()` or indirectly by cancelling a cancellable parent scope). This effectively
     * shields the scope's children and cancellable operations from propagation of cancellation requests made on the
     * non-cancellable scope.
     *
     * Note that the Promise returned by the `run` function of non-cancellable scope may still throw a `CancelledFailure`
     * if such an exception is thrown from within that scope (e.g. by directly cancelling a cancellable child scope).
     */
    cancellable;
    /**
     * An optional CancellationScope (useful for running background tasks), defaults to {@link CancellationScope.current}()
     */
    parent;
    /**
     * A Promise that throws when a cancellable scope receives a cancellation request, either directly
     * (i.e. `scope.cancel()`), or indirectly (by cancelling a cancellable parent scope).
     *
     * Note that a non-cancellable scope may receive cancellation requests, resulting in the `cancelRequested` promise for
     * that scope to throw, though the scope will not effectively get cancelled (i.e. `consideredCancelled` will still
     * return `false`, and cancellation will not be propagated to child scopes and contained operations).
     */
    cancelRequested;
    #cancelRequested = false;
    // Typescript does not understand that the Promise executor runs synchronously in the constructor
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    reject;
    constructor(options) {
        this.timeout = (0, time_1.msOptionalToNumber)(options?.timeout);
        this.cancellable = options?.cancellable ?? true;
        this.cancelRequested = new Promise((_, reject) => {
            // @ts-expect-error TSC doesn't understand that the Promise executor runs synchronously
            this.reject = (err) => {
                this.#cancelRequested = true;
                reject(err);
            };
        });
        (0, stack_helpers_1.untrackPromise)(this.cancelRequested);
        // Avoid unhandled rejections
        (0, stack_helpers_1.untrackPromise)(this.cancelRequested.catch(() => undefined));
        if (options?.parent !== NO_PARENT) {
            this.parent = options?.parent || CancellationScope.current();
            if (this.parent.cancellable ||
                (this.parent.#cancelRequested &&
                    !(0, global_attributes_1.getActivator)().hasFlag(flags_1.SdkFlags.NonCancellableScopesAreShieldedFromPropagation))) {
                this.#cancelRequested = this.parent.#cancelRequested;
                (0, stack_helpers_1.untrackPromise)(this.parent.cancelRequested.catch((err) => {
                    this.reject(err);
                }));
            }
            else {
                (0, stack_helpers_1.untrackPromise)(this.parent.cancelRequested.catch((err) => {
                    if (!(0, global_attributes_1.getActivator)().hasFlag(flags_1.SdkFlags.NonCancellableScopesAreShieldedFromPropagation)) {
                        this.reject(err);
                    }
                }));
            }
        }
    }
    /**
     * Whether the scope was effectively cancelled. A non-cancellable scope can never be considered cancelled.
     */
    get consideredCancelled() {
        return this.#cancelRequested && this.cancellable;
    }
    /**
     * Activate the scope as current and run  `fn`
     *
     * Any timers, Activities, Triggers and CancellationScopes created in the body of `fn`
     * automatically link their cancellation to this scope.
     *
     * @return the result of `fn`
     */
    run(fn) {
        return storage.run(this, this.runInContext.bind(this, fn));
    }
    /**
     * Method that runs a function in AsyncLocalStorage context.
     *
     * Could have been written as anonymous function, made into a method for improved stack traces.
     */
    async runInContext(fn) {
        let timerScope;
        if (this.timeout) {
            timerScope = new CancellationScope();
            (0, stack_helpers_1.untrackPromise)(timerScope
                .run(() => sleep(this.timeout))
                .then(() => this.cancel(), () => {
                // scope was already cancelled, ignore
            }));
        }
        try {
            return await fn();
        }
        finally {
            if (timerScope &&
                !timerScope.consideredCancelled &&
                (0, global_attributes_1.getActivator)().hasFlag(flags_1.SdkFlags.NonCancellableScopesAreShieldedFromPropagation)) {
                timerScope.cancel();
            }
        }
    }
    /**
     * Request to cancel the scope and linked children
     */
    cancel() {
        this.reject(new common_1.CancelledFailure('Cancellation scope cancelled'));
    }
    /**
     * Get the current "active" scope
     */
    static current() {
        // Using globals directly instead of a helper function to avoid circular import
        return storage.getStore() ?? globalThis.__TEMPORAL_ACTIVATOR__.rootScope;
    }
    /** Alias to `new CancellationScope({ cancellable: true }).run(fn)` */
    static cancellable(fn) {
        return new this({ cancellable: true }).run(fn);
    }
    /** Alias to `new CancellationScope({ cancellable: false }).run(fn)` */
    static nonCancellable(fn) {
        return new this({ cancellable: false }).run(fn);
    }
    /** Alias to `new CancellationScope({ cancellable: true, timeout }).run(fn)` */
    static withTimeout(timeout, fn) {
        return new this({ cancellable: true, timeout }).run(fn);
    }
}
exports.CancellationScope = CancellationScope;
const storage = new exports.AsyncLocalStorage();
class RootCancellationScope extends CancellationScope {
    constructor() {
        super({ cancellable: true, parent: NO_PARENT });
    }
    cancel() {
        this.reject(new common_1.CancelledFailure('Workflow cancelled'));
    }
}
exports.RootCancellationScope = RootCancellationScope;
/** This function is here to avoid a circular dependency between this module and workflow.ts */
let sleep = (_) => {
    throw new common_1.IllegalStateError('Workflow has not been properly initialized');
};
function registerSleepImplementation(fn) {
    sleep = fn;
}
//# sourceMappingURL=cancellation-scope.js.map