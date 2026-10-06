import type { UnsafeRandomSource } from './interfaces';
export declare function fillWithRandom(random: () => number, bytes: Uint8Array): Uint8Array;
export declare function uuid4FromRandom(random: () => number): string;
export declare function createUnsafeRandomSource(random: () => number): UnsafeRandomSource;
