import assert from "node:assert/strict";
import test from "node:test";

import {
  createTemporalDatabase,
  sampleAction
} from "../helpers/temporal-database.js";

import type {
  ApprovalDecision
} from "../../services/temporal-worker/src/shared.types.js";

test("Temporal persistence enforces approval and idempotency", async () => {
  const fixture = await createTemporalDatabase();

  try {
    const {
      recordAnalysisResultTool
    } = await import("../../services/mcp-server/src/tools/record-analysis-result.tool.js");

    const activities = await import(
      "../../services/temporal-worker/src/activities/index.js"
    );

    const { findWorkflowAnalysis } = await import(
      "../../services/temporal-worker/src/repositories/analysis.repository.js"
    );

    const incidentId = "INC-PERSISTENCE";
    const workflowId = "incident-remediation-INC-PERSISTENCE";

    await fixture.createIncident(incidentId);

    const input = {
      incident_id: incidentId,
      workflow_id: workflowId,
      probable_change_id: "CHG-201",
      confidence_score: 0.87,
      reasoning_summary: "Deployment directly preceded the incident.",
      evidence: [{ type: "DIRECT_RESOURCE_MATCH", description: "Same service." }],
      recommended_action: sampleAction,
      analysis_status: "AWAITING_APPROVAL"
    };

    await recordAnalysisResultTool(input);
    await recordAnalysisResultTool(input);

    const analysis = await findWorkflowAnalysis(incidentId, workflowId);
    assert.ok(analysis);

    const request = await activities.createApprovalRequestActivity(
      incidentId, workflowId, analysis
    );

    const repeatedRequest = await activities.createApprovalRequestActivity(
      incidentId, workflowId, analysis
    );

    assert.equal(repeatedRequest.id, request.id);

    const approval: ApprovalDecision = {
      approvalRequestId: request.id,
      decision: "APPROVED",
      decidedBy: "evaluator@example.com",
      decidedAt: "2026-08-04T08:20:00Z"
    };

    await assert.rejects(activities.executeRemediationActivity(
      incidentId, workflowId, sampleAction, approval, "SUCCESS"
    ), /No matching approved action/);

    await activities.recordApprovalDecisionActivity(incidentId, workflowId, approval);
    await activities.recordApprovalDecisionActivity(incidentId, workflowId, approval);

    await assert.rejects(activities.recordApprovalDecisionActivity(
      incidentId, workflowId, { ...approval, decision: "REJECTED" }
    ), /already been recorded/);

    await assert.rejects(activities.executeRemediationActivity(
      incidentId, workflowId, { ...sampleAction, resource: "unknown-service" },
      approval, "SUCCESS"
    ), /No matching approved action/);

    const result = await activities.executeRemediationActivity(
      incidentId, workflowId, sampleAction, approval, "SUCCESS"
    );

    const repeatedResult = await activities.executeRemediationActivity(
      incidentId, workflowId, sampleAction, approval, "SUCCESS"
    );

    assert.deepEqual(repeatedResult, result);

    const health = await activities.verifyServiceHealthActivity(incidentId, workflowId);
    const repeatedHealth = await activities.verifyServiceHealthActivity(incidentId, workflowId);

    assert.equal(health.healthy, true);
    assert.deepEqual(repeatedHealth, health);

    await activities.recordWorkflowStatusActivity(incidentId, workflowId, "RESOLVED");
    await activities.recordWorkflowStatusActivity(incidentId, workflowId, "RESOLVED");

    const counts = await fixture.query(`
      SELECT
        (SELECT COUNT(*) FROM analysis_results) AS analyses,
        (SELECT COUNT(*) FROM approval_requests) AS approvals,
        (SELECT COUNT(*) FROM remediation_attempts) AS attempts,
        (SELECT COUNT(*) FROM audit_events WHERE action = 'REMEDIATION_ATTEMPTED') AS remediation_events,
        (SELECT COUNT(*) FROM audit_events WHERE action = 'HEALTH_VERIFIED') AS health_events
    `);

    assert.deepEqual(counts.rows[0], {
      analyses: 1,
      approvals: 1,
      attempts: 1,
      remediation_events: 1,
      health_events: 1
    });

    const incident = await fixture.query(
      "SELECT status FROM incidents WHERE id = $1", [incidentId]
    );

    assert.equal((incident.rows[0] as { status: string }).status, "RESOLVED");

    await recordAnalysisResultTool(input);

    const afterRetry = await fixture.query(
      "SELECT status FROM incidents WHERE id = $1", [incidentId]
    );

    assert.equal((afterRetry.rows[0] as { status: string }).status, "RESOLVED");

    assert.deepEqual(
      await activities.analyseIncidentActivity(incidentId, workflowId),
      analysis
    );

    await fixture.query(
      "UPDATE changes SET metadata = '{\"previous_version\":\"unknown\"}'::jsonb WHERE id = 'CHG-201'"
    );

    await assert.rejects(activities.executeRemediationActivity(
      incidentId, workflowId, sampleAction, approval, "SUCCESS"
    ), /No matching approved action/);

    await fixture.query(
      "UPDATE changes SET metadata = '{\"previous_version\":\"v2.4.0\"}'::jsonb WHERE id = 'CHG-201'"
    );

    await fixture.createIncident("INC-MANUAL");
    await recordAnalysisResultTool({
      ...input,
      incident_id: "INC-MANUAL",
      workflow_id: "incident-remediation-INC-MANUAL",
      probable_change_id: null,
      analysis_status: "MANUAL_INVESTIGATION"
    });

    const manual = await fixture.query(
      "SELECT status FROM incidents WHERE id = 'INC-MANUAL'"
    );

    assert.equal((manual.rows[0] as { status: string }).status, "ESCALATED");
  } finally {
    await fixture.close();
  }
});
