import { ApplicationFailure } from "@temporalio/activity";

import type {
  AnalysisActivityResult,
  ApprovalDecision,
  ApprovalRequest
} from "../shared.types.js";

import {
  isValidApprovalDecision,
  validateRemediationAction
} from "../remediation-policy.js";

import { withTransaction } from "./transaction.js";
import { recordWorkflowAudit } from "./audit.repository.js";

export async function createApprovalRequest(
  incidentId: string,
  workflowId: string,
  analysis: AnalysisActivityResult
): Promise<ApprovalRequest> {
  validateRemediationAction(analysis.recommendedAction);

  return withTransaction(async client => {
    const result = await client.query<{
      id: string;
      analysis_id: string;
      requested_action: ApprovalRequest["requestedAction"];
    }>(
      `
        INSERT INTO approval_requests (
          incident_id, workflow_id, analysis_id, requested_action
        )
        SELECT incident_id, workflow_id, id, recommended_action
        FROM analysis_results
        WHERE id = $1 AND incident_id = $2 AND workflow_id = $3
          AND analysis_status = 'AWAITING_APPROVAL'
          AND recommended_action = $4::jsonb
        ON CONFLICT (workflow_id)
        DO UPDATE SET workflow_id = EXCLUDED.workflow_id
        RETURNING id, analysis_id, requested_action
      `,
      [
        analysis.analysisId,
        incidentId,
        workflowId,
        JSON.stringify(analysis.recommendedAction)
      ]
    );

    const row = result.rows[0];

    if (!row) {
      throw ApplicationFailure.nonRetryable(
        "A matching persisted analysis is required before approval",
        "INVALID_ANALYSIS"
      );
    }

    const request: ApprovalRequest = {
      id: String(row.id),
      analysisId: String(row.analysis_id),
      requestedAction: row.requested_action
    };

    await recordWorkflowAudit(client, {
      incidentId,
      workflowId,
      eventKey: `${workflowId}:approval-request`,
      actorType: "TEMPORAL_ACTIVITY",
      actorName: "createApprovalRequestActivity",
      action: "APPROVAL_REQUESTED",
      output: request,
      status: "PENDING"
    });

    return request;
  });
}

export async function recordApprovalDecision(
  incidentId: string,
  workflowId: string,
  decision: ApprovalDecision
): Promise<ApprovalDecision> {
  if (!isValidApprovalDecision(decision)) {
    throw ApplicationFailure.nonRetryable(
      "The approval decision is invalid",
      "INVALID_APPROVAL"
    );
  }

  return withTransaction(async client => {
    const result = await client.query<{
      status: string;
      responded_by: string | null;
      responded_at: Date | null;
      comment: string | null;
    }>(
      `
        SELECT status, responded_by, responded_at, comment
        FROM approval_requests
        WHERE id = $1 AND incident_id = $2 AND workflow_id = $3
        FOR UPDATE
      `,
      [decision.approvalRequestId, incidentId, workflowId]
    );

    const row = result.rows[0];

    if (!row) {
      throw ApplicationFailure.nonRetryable(
        "Approval request does not belong to this workflow",
        "APPROVAL_NOT_FOUND"
      );
    }

    if (row.status !== "PENDING") {
      if (
        row.status !== decision.decision ||
        row.responded_by !== decision.decidedBy ||
        row.comment !== (decision.comment ?? null)
      ) {
        throw ApplicationFailure.nonRetryable(
          "An approval decision has already been recorded",
          "APPROVAL_CONFLICT"
        );
      }

      return {
        ...decision,
        decidedAt: row.responded_at!.toISOString()
      };
    }

    await client.query(
      `
        UPDATE approval_requests
        SET status = $2, responded_by = $3,
            responded_at = $4, comment = $5
        WHERE id = $1
      `,
      [
        decision.approvalRequestId,
        decision.decision,
        decision.decidedBy,
        decision.decidedAt,
        decision.comment ?? null
      ]
    );

    await recordWorkflowAudit(client, {
      incidentId,
      workflowId,
      eventKey: `${workflowId}:approval-decision`,
      actorType: "USER",
      actorName: decision.decidedBy,
      action: `REMEDIATION_${decision.decision}`,
      input: decision,
      status: decision.decision
    });

    return decision;
  });
}
