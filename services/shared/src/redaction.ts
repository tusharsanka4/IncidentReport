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

    return value
      .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s/]*@/gi, match => `${match.split("://")[0]}://[REDACTED]@`)
      .replace(/\bBearer\s+[^\s"',;]+/gi, "Bearer [REDACTED]")
      .replace(/\b(password|secret|token|api[_-]?key|authorization)\s*[:=]\s*[^\s"',;]+/gi, "$1=[REDACTED]");
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
