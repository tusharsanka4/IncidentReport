/**
 * Describes how an operation value of type `T` maps to a transfer representation of type `D`.
 *
 * A transfer representation can be more suitable for moving between a Nexus caller and handler. For example, an
 * application can map a class instance to a plain object and reconstruct the class after transfer.
 *
 * @experimental
 */
export interface TypeInfo<T = unknown, D = T> {
  /**
   * Converts between an application value and its transfer representation.
   */
  transferTypeConverter?: TransferTypeConverter<T, D>;
}

/**
 * Converts between an application value of type `T` and its transfer representation of type `D`.
 *
 * @experimental
 */
export interface TransferTypeConverter<T, D = unknown> {
  /** Converts a transfer representation back to its application value. */
  fromTransferType(value: D): T;

  /** Converts an application value to its transfer representation. */
  toTransferType(value: T): D;
}
