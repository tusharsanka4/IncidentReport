import {
  condition,
  defineQuery,
  defineSignal,
  proxyActivities,
  setHandler
} from "@temporalio/workflow";

import type * as activities from "../activities/index.js";

import type {
  ApprovalDecision,
  IncidentWorkflowInput,
  IncidentWorkflowResult,
  WorkflowStatus
} from "../shared.types.js";

const analysisActivities =
  proxyActivities<typeof activities>({
    startToCloseTimeout: "5 minutes",

    retry: {
      maximumAttempts: 3,
      initialInterval: "5 seconds",
      backoffCoefficient: 2
    }
  });

const remediationActivities =
  proxyActivities<typeof activities>({
    startToCloseTimeout: "2 minutes",

    retry: {
      maximumAttempts: 1
    }
  });

export const approvalDecisionSignal =
  defineSignal<[ApprovalDecision]>(
    "approvalDecision"
  );

export const workflowStatusQuery =
  defineQuery<WorkflowStatus>(
    "workflowStatus"
  );

export async function incidentRemediationWorkflow(
  input: IncidentWorkflowInput
): Promise<IncidentWorkflowResult> {
  let status: WorkflowStatus =
    "ANALYSING";

  let approval:
    ApprovalDecision | undefined;

  setHandler(
    workflowStatusQuery,
    () => status
  );

  setHandler(
    approvalDecisionSignal,
    decision => {
      /*
       * Accept only the first decision.
       * Later duplicate signals are ignored.
       */
      if (!approval) {
        approval = decision;
      }
    }
  );

const analysis =
  await analysisActivities
    .analyseIncidentActivity(
      input.incidentId
    );

  if (
    analysis.analysisStatus ===
    "MANUAL_INVESTIGATION"
  ) {
    status = "MANUAL_INVESTIGATION";

    return {
      incidentId: input.incidentId,
      status,
      analysis
    };
  }

  status = "AWAITING_APPROVAL";

  /*
   * The workflow pauses here without consuming
   * CPU while waiting for an approval signal.
   */
  await condition(
    () => approval !== undefined
  );

  const finalApproval = approval;

  if (!finalApproval) {
    throw new Error(
      "Approval condition completed without a decision"
    );
  }

  if (
    finalApproval.decision === "REJECTED"
  ) {
    status = "REJECTED";

    return {
      incidentId: input.incidentId,
      status,
      analysis,
      approval: finalApproval
    };
  }

status = "APPROVED";

const remediation =
  await remediationActivities
    .executeRemediationActivity(
      analysis.recommendedAction,
      finalApproval
    );

status = "REMEDIATION_COMPLETED";

return {
  incidentId: input.incidentId,
  status,
  analysis,
  approval: finalApproval,
  remediation
};
}