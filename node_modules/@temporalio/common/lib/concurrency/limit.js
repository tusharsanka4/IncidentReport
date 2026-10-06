"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.limit = limit;
exports.sequential = sequential;
const semaphore_1 = require("./semaphore");
/**
 * Creates a {@link ConcurrencyLimit} allowing at most `concurrency` functions to run at once backed
 * by a {@link Semaphore}.
 *
 * @internal
 */
function limit(concurrency) {
    const semaphore = new semaphore_1.Semaphore(Math.max(1, concurrency));
    return async (fn) => {
        await semaphore.acquire();
        try {
            return await fn();
        }
        finally {
            semaphore.release();
        }
    };
}
/**
 * Creates a {@link ConcurrencyLimit} that runs one function at a time.
 *
 * @internal
 */
function sequential() {
    return limit(1);
}
//# sourceMappingURL=limit.js.map