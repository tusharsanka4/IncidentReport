import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidApprovalDecision,
  parseSimulationScenario,
  validateRemediationAction
} from "../../services/temporal-worker/src/remediation-policy.js";

import {
  simulateRemediation,
  simulateServiceHealth
} from "../../services/temporal-worker/src/simulation.js";

import {
  redactSensitiveData
} from "../../services/shared/src/redaction.js";

import type {
  ApprovalDecision,
  RecommendedAction
} from "../../services/temporal-worker/src/shared.types.js";

const action: RecommendedAction = {
  type: "ROLLBACK",
  resource: "order-service",
  from_version: "v2.4.1",
  to_version: "v2.4.0",
  execution: "HUMAN_APPROVAL_REQUIRED",
  requires_approval: true
};

const approval: ApprovalDecision = {
  approvalRequestId: "1",
  decision: "APPROVED",
  decidedBy: "evaluator@example.com",
  decidedAt: "2026-08-04T08:20:00Z"
};

test("approval requires identity, request ID, and a valid decision", () => {
  assert.equal(isValidApprovalDecision(approval), true);
  assert.equal(isValidApprovalDecision({ ...approval, decidedBy: " " }), false);
  assert.equal(isValidApprovalDecision({ ...approval, approvalRequestId: "" }), false);
  assert.equal(isValidApprovalDecision({ ...approval, decidedAt: "invalid" }), false);
  assert.equal(isValidApprovalDecision({
    ...approval,
    decision: "UNKNOWN" as ApprovalDecision["decision"]
  }), false);
});

test("remediation policy rejects unsafe and incomplete actions", () => {
  assert.doesNotThrow(() => validateRemediationAction(action));
  assert.throws(() => validateRemediationAction({ ...action, requires_approval: false }));
  assert.throws(() => validateRemediationAction({ ...action, to_version: undefined }));
  assert.throws(() => validateRemediationAction({ ...action, to_version: "v2.4.1" }));
  assert.throws(() => validateRemediationAction({ ...action, type: "MANUAL_INVESTIGATION" }));
});

test("controlled remediation failure cannot produce healthy verification", () => {
  const result = simulateRemediation(action, "REMEDIATION_FAILURE", "test-time");

  assert.equal(result.success, false);
  assert.equal(result.simulated, true);
  assert.equal(simulateServiceHealth(result, "SUCCESS", "test-time").healthy, false);
});

test("successful remediation still requires a healthy verification", () => {
  const result = simulateRemediation(action, "SUCCESS", "test-time");

  assert.equal(simulateServiceHealth(result, "SUCCESS", "test-time").healthy, true);
  assert.equal(simulateServiceHealth(result, "UNHEALTHY", "test-time").healthy, false);
});

test("simulation configuration rejects unsupported scenarios", () => {
  assert.equal(parseSimulationScenario(undefined), "SUCCESS");
  assert.throws(() => parseSimulationScenario("REAL_PRODUCTION"));
});

test("audit redaction removes sensitive keys recursively", () => {
  assert.deepEqual(redactSensitiveData({
    incidentId: "INC-1042",
    password: "private",
    metadata: [{ api_key: "private", status: "healthy" }]
  }), {
    incidentId: "INC-1042",
    password: "[REDACTED]",
    metadata: [{ api_key: "[REDACTED]", status: "healthy" }]
  });

  assert.deepEqual(redactSensitiveData({
    content: [{ type: "text", text: '{"token":"private","status":"healthy"}' }]
  }), {
    content: [{ type: "text", text: '{"token":"[REDACTED]","status":"healthy"}' }]
  });
});
