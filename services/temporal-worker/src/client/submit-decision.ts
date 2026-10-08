import type { WorkflowHandle } from "@temporalio/client";

import type {
  ApprovalDecision,
  ApprovalDecisionType,
  IncidentWorkflow,
  IncidentWorkflowSnapshot
} from "../shared.types.js";

export async function submitApprovalDecision(
  handle: WorkflowHandle<IncidentWorkflow>,
  decision: ApprovalDecisionType,
  decidedBy: string,
  comment?: string
): Promise<boolean> {
  if (!decidedBy.trim()) {
    throw new Error("An approver identity is required");
  }

  const description = await handle.describe();

  const snapshot = description.status.name === "COMPLETED"
    ? await handle.result()
    : await handle.query<IncidentWorkflowSnapshot>("workflowSnapshot");

  if (snapshot.approval) {
    if (
      snapshot.approval.decision !== decision ||
      snapshot.approval.decidedBy !== decidedBy ||
      snapshot.approval.comment !== comment
    ) {
      throw new Error(
        "A conflicting approval decision is already recorded"
      );
    }

    return false;
  }

  if (
    snapshot.status !== "AWAITING_APPROVAL" ||
    !snapshot.approvalRequest
  ) {
    throw new Error(
      `Workflow is ${snapshot.status}; no approval is pending`
    );
  }

  console.log(
    "Pending recommendation:",
    JSON.stringify(snapshot.approvalRequest.requestedAction, null, 2)
  );

  const approval: ApprovalDecision = {
    approvalRequestId: snapshot.approvalRequest.id,
    decision,
    decidedBy,
    comment,
    decidedAt: new Date().toISOString()
  };

  await handle.signal(
    decision === "APPROVED"
      ? "approveRemediation"
      : "rejectRemediation",
    approval
  );

  return true;
}
