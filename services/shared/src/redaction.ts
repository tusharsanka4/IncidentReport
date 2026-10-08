const SENSITIVE_KEY =
  /password|secret|token|authorization|cookie|api[_-]?key|credential/i;

export function redactSensitiveData(
  value: unknown
): unknown {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);

      if (parsed !== null && typeof parsed === "object") {
        return JSON.stringify(redactSensitiveData(parsed));
      }
    } catch {
      // Ordinary log messages are not JSON documents.
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redactSensitiveData);
  }

  if (
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY.test(key)
        ? "[REDACTED]"
        : redactSensitiveData(entry)
    ])
  );
}
