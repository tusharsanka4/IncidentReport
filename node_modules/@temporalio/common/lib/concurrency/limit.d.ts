/**
 * Runs `fn` once a permit is available and releases the permit when it settles.
 * Following the shape of plimit's limit here.
 *
 * @internal
 */
export type ConcurrencyLimit = <T>(fn: () => Promise<T>) => Promise<T>;
/**
 * Creates a {@link ConcurrencyLimit} allowing at most `concurrency` functions to run at once backed
 * by a {@link Semaphore}.
 *
 * @internal
 */
export declare function limit(concurrency: number): ConcurrencyLimit;
/**
 * Creates a {@link ConcurrencyLimit} that runs one function at a time.
 *
 * @internal
 */
export declare function sequential(): ConcurrencyLimit;
