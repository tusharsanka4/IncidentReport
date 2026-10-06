/**
 * A simple counting semaphore. `release` hands a permit directly to the longest-waiting acquirer if
 * any, otherwise returns it to the pool.
 *
 * @internal
 */
export declare class Semaphore {
    private permits;
    private readonly waiters;
    constructor(permits: number);
    acquire(): Promise<void>;
    release(): void;
}
