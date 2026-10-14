import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { canAnalyse, canApprove, stages, toolData } from "../../services/web/public/state.mjs";
import { escapeHtml } from "../../services/web/public/view.mjs";
import { ApiError, readAudit, request } from "../../services/web/public/api.mjs";
import { incidentBody } from "../../services/web/public/form.mjs";

test("sample form timestamps include seconds and remain UTC", () => {
  const fields = { incident_id: " INC-DEMO ", service: "order-service", environment: "production", symptom: "Failures", detected_at: "2026-08-04T08:15" };
  const body = incidentBody(fields);
  assert.equal(body.detected_at, "2026-08-04T08:15:00.000Z");
  assert.equal(body.incident_id, "INC-DEMO");
  assert.equal(incidentBody({ ...fields, detected_at: "2026-08-04T08:15:12" }).detected_at, "2026-08-04T08:15:12.000Z");
  assert.throws(() => incidentBody({ ...fields, detected_at: "" }), /valid detection date/);
});

function state(overrides = {}) {
  return { incident: { status: "RECEIVED" }, workflow: null, analysis: null, audit: [], busy: false, offline: false, ...overrides };
}

test("analysis starts only for a fresh connected incident without a workflow", () => {
  assert.equal(canAnalyse(state()), true);
  for (const overrides of [{ busy: true }, { offline: true }, { incident: null },
    { workflow: { status: "ANALYSING" } }, { incident: { status: "RESOLVED" } }]) {
    assert.equal(canAnalyse(state(overrides)), false);
  }
});

test("approval requires a matching pending request and disables stale or duplicate decisions", () => {
  const waiting = { status: "AWAITING_APPROVAL", approval_request: { id: "1" } };
  assert.equal(canApprove(state({ workflow: waiting })), true);
  for (const status of ["ANALYSING", "REMEDIATING", "RESOLVED", "REJECTED", "ESCALATED"]) {
    assert.equal(canApprove(state({ workflow: { ...waiting, status } })), false);
  }
  assert.equal(canApprove(state({ workflow: { ...waiting, approval: { decision: "APPROVED" } } })), false);
  assert.equal(canApprove(state({ workflow: waiting, offline: true })), false);
  assert.equal(canApprove(state({ workflow: waiting, busy: true })), false);
  assert.equal(canApprove(state({ workflow: { status: "AWAITING_APPROVAL" } })), false);
});

test("manual investigation skips approval and records an outcome instead of a fake recovery", () => {
  const result = stages(state({ workflow: { status: "ESCALATED" }, analysis: { analysis_status: "MANUAL_INVESTIGATION" } }));
  assert.equal(result[4].state, "skipped");
  assert.equal(result[5].state, "done");
  assert.equal(canApprove(state({ workflow: { status: "ESCALATED" } })), false);
});

test("agent context uses actual MCP tool output and handles malformed records", () => {
  const data = { candidates: [{ change: { id: "CHG-201" } }] };
  assert.deepEqual(toolData({ output: { content: [{ type: "text", text: JSON.stringify(data) }] } }), data);
  assert.equal(toolData({ output: "invalid" }), null);
  assert.equal(toolData(null), null);
});

test("incident, model, and audit text is escaped before HTML rendering", () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(escapeHtml("' &"), "&#39; &amp;");
});

test("API errors preserve correlation IDs and expected missing results stay optional", async () => {
  const mocked = mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
    error: { code: "WORKFLOW_NOT_FOUND", message: "No workflow exists", request_id: "req-demo" }
  }), { status: 404 }));
  try {
    assert.equal(await request("/missing", { optional: true }), null);
    await assert.rejects(request("/missing"), error => error instanceof ApiError &&
      error.code === "WORKFLOW_NOT_FOUND" && error.message.includes("req-demo"));
  } finally {
    mocked.mock.restore();
  }
});

test("audit retrieval paginates beyond the first 500 events", async () => {
  const urls = [];
  const mocked = mock.method(globalThis, "fetch", async url => {
    urls.push(url);
    return new Response(JSON.stringify({ data: { events: urls.length === 1
      ? Array.from({ length: 500 }, (_, id) => ({ id })) : [{ id: 500 }] } }));
  });
  try {
    assert.equal((await readAudit("/api/incidents/INC-DEMO")).length, 501);
    assert.ok(urls[1].endsWith("offset=500"));
  } finally {
    mocked.mock.restore();
  }
});
