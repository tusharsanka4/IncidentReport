/**
 * A Nexus Failure represents protocol-level failures.
 *
 * See https://github.com/nexus-rpc/api/blob/main/SPEC.md#failure
 *
 * @experimental
 */
export interface Failure {
  message: string;
  stackTrace?: string;
  /**
   * Arbitrary key-value metadata associated with this failure.
   */
  metadata?: Record<string, string>;
  /**
   * Structured details associated with this failure.
   */
  details?: Record<string, unknown>;
  cause?: Failure;
}
