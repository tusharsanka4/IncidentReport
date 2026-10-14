export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function request(path, { method = "GET", body, signal, optional = false } = {}) {
  const timeout = AbortSignal.timeout(12000);
  const response = await fetch(path, {
    method,
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const result = await response.json();
  if (optional && response.status === 404) return null;
  if (!response.ok) {
    const error = result.error ?? {};
    const reference = error.request_id ? ` (request ${error.request_id})` : "";
    const details = Array.isArray(error.details) ? error.details.map(detail => {
      const field = detail.instancePath?.replace(/^\//, "") || detail.params?.missingProperty || detail.params?.additionalProperty || "Request";
      return `${field}: ${detail.message}`;
    }).join("; ") : "";
    throw new ApiError(`${details || error.message || "Request failed"}${reference}`, response.status, error.code);
  }
  return result.data ?? result;
}

export async function readAudit(path, signal) {
  const events = [];
  let page;
  do {
    page = await request(`${path}/audit-log?limit=500&offset=${events.length}`, { signal });
    events.push(...page.events);
  } while (page.events.length === 500);
  return events;
}
