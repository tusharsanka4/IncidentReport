import { redactSensitiveData } from "../../../shared/src/redaction.js";

export type UnknownRecord =
  Record<string, unknown>;

export function isRecord(
  value: unknown
): value is UnknownRecord {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export function unwrapToolData(
  value: unknown
): unknown {
  if (isRecord(value) && "error" in value) {
    const error = value.error;
    throw new Error(isRecord(error) && typeof error.message === "string"
      ? String(redactSensitiveData(error.message)) : "The MCP operation failed");
  }
  if (
    isRecord(value) &&
    "data" in value
  ) {
    return value.data;
  }

  return value;
}

export function getErrorMessage(
  error: unknown
): string {
  if (error instanceof Error) {
    return String(redactSensitiveData(error.message));
  }

  return String(redactSensitiveData(String(error)));
}
