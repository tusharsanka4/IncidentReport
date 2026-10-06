"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Semaphore = void 0;
/**
 * A simple counting semaphore. `release` hands a permit directly to the longest-waiting acquirer if
 * any, otherwise returns it to the pool.
 *
 * @internal
 */
class Semaphore {
    permits;
    waiters = [];
    constructor(permits) {
        this.permits = permits;
    }
    async acquire() {
        if (this.permits > 0) {
            this.permits -= 1;
            return;
        }
        return new Promise((resolve) => {
            this.waiters.push(resolve);
        });
    }
    release() {
        const waiter = this.waiters.shift();
        if (waiter !== undefined) {
            waiter();
        }
        else {
            this.permits += 1;
        }
    }
}
exports.Semaphore = Semaphore;
//# sourceMappingURL=semaphore.js.map