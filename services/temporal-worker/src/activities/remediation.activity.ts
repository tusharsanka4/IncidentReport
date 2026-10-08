import { ApplicationFailure } from "@temporalio/activity";

import type {
  ApprovalDecision,
  RecommendedAction,
  RemediationResult,
  SimulationScenario
} from "../shared.types.js";

import {
  isValidApprovalDecision,
  parseSimulationScenario,
  validateRemediationAction
} from "../remediation-policy.js";

import { simulateRemediation } from "../simulation.js";
import { withTransaction } from "../repositories/transaction.js";
import { recordWorkflowAudit } from "../repositories/audit.repository.js";

export async function executeRemediationActivity(
  incidentId: string,
  workflowId: string,
  action: RecommendedAction,
  approval: ApprovalDecision,
  simulation: SimulationScenario
): Promise<RemediationResult> {
  if (
    !isValidApprovalDecision(approval) ||
    approval.decision !== "APPROVED"
  ) {
    throw ApplicationFailure.nonRetryable(
      "Remediation cannot run without approval",
      "APPROVAL_REQUIRED"
    );
  }

  try {
    validateRemediationAction(action);
    parseSimulationScenario(simulation);
  } catch (error) {
    throw ApplicationFailure.nonRetryable(
      error instanceof Error ? error.message : String(error),
      "INVALID_REMEDIATION"
    );
  }

  return withTransaction(async client => {
    // Lock approval first so concurrent retries cannot simulate twice.
    const approvedRequest = await client.query(
      `
        SELECT approvals.id
        FROM approval_requests AS approvals
        JOIN analysis_results AS analysis
          ON analysis.id = approvals.analysis_id
        JOIN incidents ON incidents.id = approvals.incident_id
        JOIN changes ON changes.id = analysis.probable_change_id
        JOIN resources ON resources.id = changes.resource_id
        WHERE approvals.id = $1
          AND approvals.incident_id = $2
          AND approvals.workflow_id = $3
          AND analysis.workflow_id = $3
          AND approvals.status = 'APPROVED'
          AND approvals.responded_by = $4
          AND approvals.requested_action = $5::jsonb
          AND analysis.recommended_action = approvals.requested_action
          AND resources.id = $6
          AND resources.environment = incidents.environment
          AND changes.environment = incidents.environment
          AND resources.resource_type IN ('SERVICE', 'CACHE', 'DATABASE', 'QUEUE')
          AND (
            $7 <> 'ROLLBACK'
            OR (
              changes.change_type = 'deployment'
              AND resources.resource_type = 'SERVICE'
              AND changes.version = $8
              AND changes.metadata->>'previous_version' = $9
            )
          )
          AND (
            $7 <> 'CONFIGURATION_REVERT'
            OR changes.change_type = 'configuration'
          )
        FOR UPDATE OF approvals
      `,
      [
        approval.approvalRequestId,
        incidentId,
        workflowId,
        approval.decidedBy,
        JSON.stringify(action),
        action.resource,
        action.type,
        action.from_version ?? null,
        action.to_version ?? null
      ]
    );

    if (approvedRequest.rowCount === 0) {
      throw ApplicationFailure.nonRetryable(
        "No matching approved action and target exist for this workflow",
        "APPROVAL_MISMATCH"
      );
    }

    const existingAttempt = await client.query<{
      result: RemediationResult;
      simulation: SimulationScenario;
    }>(
      "SELECT result, simulation FROM remediation_attempts WHERE workflow_id = $1",
      [workflowId]
    );

    const existing = existingAttempt.rows[0];

    if (existing) {
      if (existing.simulation !== simulation) {
        throw ApplicationFailure.nonRetryable(
          "Cannot change the simulation scenario of an existing attempt",
          "REMEDIATION_CONFLICT"
        );
      }

      return existing.result;
    }

    const result = simulateRemediation(
      action,
      simulation,
      new Date().toISOString()
    );

    await client.query(
      `
        INSERT INTO remediation_attempts (
          workflow_id, incident_id, approval_request_id,
          requested_action, simulation, result
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb)
      `,
      [
        workflowId,
        incidentId,
        approval.approvalRequestId,
        JSON.stringify(action),
        simulation,
        JSON.stringify(result)
      ]
    );

    await recordWorkflowAudit(client, {
      incidentId,
      workflowId,
      eventKey: `${workflowId}:remediation`,
      actorType: "TEMPORAL_ACTIVITY",
      actorName: "executeRemediationActivity",
      action: "REMEDIATION_ATTEMPTED",
      input: { action, approvalRequestId: approval.approvalRequestId },
      output: result,
      status: result.success ? "SUCCESS" : "FAILED"
    });

    return result;
  });
}
