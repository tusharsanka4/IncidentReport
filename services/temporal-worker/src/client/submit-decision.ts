import type { WorkflowHandle } from "@temporalio/client";

import type {
  ApprovalDecision,
  ApprovalDecisionType,
  IncidentWorkflow,
  IncidentWorkflowSnapshot
} from "../shared.types.js";

import { DecisionError } from "./decision-error.js";

export async function submitApprovalDecision(
  handle: WorkflowHandle<IncidentWorkflow>,
  decision: ApprovalDecisionType,
  decidedBy: string,
  comment?: string
): Promise<boolean> {
  if (!decidedBy.trim()) {
    throw new DecisionError(
      "INVALID_APPROVAL",
      "An approver identity is required"
    );
  }

  const description = await handle.describe();

  if (
    description.status.name !== "RUNNING" &&
    description.status.name !== "COMPLETED"
  ) {
    throw new DecisionError(
      "APPROVAL_NOT_PENDING",
      `Workflow execution is ${description.status.name}; no approval is pending`
    );
  }

  const snapshot = description.status.name === "COMPLETED"
    ? await handle.result()
    : await handle.query<IncidentWorkflowSnapshot>("workflowSnapshot");

  if (snapshot.approval) {
    if (
      snapshot.approval.decision !== decision ||
      snapshot.approval.decidedBy !== decidedBy ||
      snapshot.approval.comment !== comment
    ) {
      throw new DecisionError(
        "APPROVAL_CONFLICT",
        "A conflicting approval decision is already recorded"
      );
    }

    return false;
  }

  if (
    snapshot.status !== "AWAITING_APPROVAL" ||
    !snapshot.approvalRequest
  ) {
    throw new DecisionError(
      "APPROVAL_NOT_PENDING",
      `Workflow is ${snapshot.status}; no approval is pending`
    );
  }

  const approval: ApprovalDecision = {
    approvalRequestId: snapshot.approvalRequest.id,
    decision,
    decidedBy,
    comment,
    decidedAt: new Date().toISOString()
  };

  // Commit the first human decision before delivery. A signal is still
  // required to resume the workflow; repeating delivery is safe.
  const { recordApprovalDecision } = await import(
    "../repositories/approval.repository.js"
  );

  const recorded = await recordApprovalDecision(
    snapshot.incidentId,
    snapshot.workflowId,
    approval
  );

  await handle.signal(
    decision === "APPROVED"
      ? "approveRemediation"
      : "rejectRemediation",
    recorded
  );

  return true;
}
