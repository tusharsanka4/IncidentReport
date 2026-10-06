"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.visit = visit;
const limit_1 = require("../concurrency/limit");
/**
 * Awaits every promise a walk produced, then throws the first rejection in traversal order.
 * `allSettled` guarantees no in-flight transform is left running on the error path.
 */
async function drain(pending) {
    const results = await Promise.allSettled(pending);
    for (const result of results) {
        if (result.status === 'rejected') {
            throw result.reason;
        }
    }
}
/**
 * Runs a recursive walk from the VisitOptions. Runs each transform through the concurrency limit,
 * then wraps them with the per-visit cancel-on-error signal and assigns them to {@link WalkEnv}.
 *
 * @internal
 * @experimental
 */
async function runVisit(options, walk) {
    const { transformPayload, transformPayloads, deriveContext, initialContext, limit = (0, limit_1.sequential)(), skipHeaders = false, skipSearchAttributes = false, abortSignal, } = options;
    const failure = new AbortController();
    let removeListener;
    if (abortSignal) {
        if (abortSignal.aborted) {
            failure.abort(abortSignal.reason);
        }
        else {
            const onAbort = () => failure.abort(abortSignal.reason);
            abortSignal.addEventListener('abort', onAbort, { once: true });
            removeListener = () => abortSignal.removeEventListener('abort', onAbort);
        }
    }
    const runTransform = (call) => {
        failure.signal.throwIfAborted();
        return limit(async () => {
            failure.signal.throwIfAborted();
            try {
                return await call(failure.signal);
            }
            catch (reason) {
                failure.abort(reason);
                throw reason;
            }
        });
    };
    const env = {
        transformPayload: (payload, context) => runTransform((signal) => transformPayload(payload, context, signal)),
        transformPayloads: (payloads, context) => runTransform((signal) => transformPayloads(payloads, context, signal)),
        deriveContext,
        skipHeaders,
        skipSearchAttributes,
    };
    try {
        await drain(walk(env, initialContext));
    }
    finally {
        removeListener?.();
    }
}
/**
 * Applies the payload transforms to every {@link Payload} in `root`, mutating it in place. Pass the
 * generated `walk*` function for the root's message type (all are re-exported below).
 *
 * @internal
 * @experimental
 */
async function visit(root, walk, options) {
    return runVisit(options, (env, context) => walk(root, env, context));
}
// Re-export every generated walker so consumers pair any of them with `visit` without a deep import
// into the generated file.
__exportStar(require("@temporalio/proto/lib/payload-visitor.generated"), exports);
//# sourceMappingURL=payload-visitor.js.map