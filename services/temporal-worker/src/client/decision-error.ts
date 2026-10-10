export type DecisionErrorCode =
  | "APPROVAL_CONFLICT"
  | "APPROVAL_NOT_PENDING"
  | "INVALID_APPROVAL";

export class DecisionError extends Error {
  constructor(
    public readonly code: DecisionErrorCode,
    message: string
  ) {
    super(message);
    this.name = "DecisionError";
  }
}
