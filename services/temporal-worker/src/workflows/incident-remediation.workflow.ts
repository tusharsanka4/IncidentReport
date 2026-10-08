import {
  condition,
  defineQuery,
  defineSignal,
  isCancellation,
  proxyActivities,
  setHandler,
  workflowInfo
} from "@temporalio/workflow";

import type * as activities from "../activities/index.js";

import type {
  ApprovalDecision,
  IncidentWorkflowInput,
  IncidentWorkflowSnapshot,
  WorkflowStatus
} from "../shared.types.js";

import {
  isValidApprovalDecision,
  parseSimulationScenario,
  validateRemediationAction
} from "../remediation-policy.js";

const analysisActivities =
  proxyActivities<typeof activities>({
    startToCloseTimeout: "5 minutes",
    scheduleToCloseTimeout: "20 minutes",
    retry: {
      maximumAttempts: 3,
      initialInterval: "5 seconds",
      backoffCoefficient: 2
    }
  });

const lifecycleActivities =
  proxyActivities<typeof activities>({
    startToCloseTimeout: "1 minute",
    scheduleToCloseTimeout: "5 minutes",
    retry: {
      maximumAttempts: 3,
      initialInterval: "1 second",
      backoffCoefficient: 2
    }
  });

const remediationActivities =
  proxyActivities<typeof activities>({
    startToCloseTimeout: "2 minutes",
    scheduleToCloseTimeout: "10 minutes",
    retry: {
      maximumAttempts: 3,
      initialInterval: "2 seconds",
      backoffCoefficient: 2
    }
  });

// Retained for compatibility with the original decision client.
export const approvalDecisionSignal =
  defineSignal<[ApprovalDecision]>("approvalDecision");

export const approveRemediationSignal =
  defineSignal<[ApprovalDecision]>("approveRemediation");

export const rejectRemediationSignal =
  defineSignal<[ApprovalDecision]>("rejectRemediation");

export const workflowStatusQuery =
  defineQuery<WorkflowStatus>("workflowStatus");

export const workflowSnapshotQuery =
  defineQuery<IncidentWorkflowSnapshot>("workflowSnapshot");

export const recommendationQuery =
  defineQuery<IncidentWorkflowSnapshot["analysis"]>("getRecommendation");

export const approvalStatusQuery =
  defineQuery<IncidentWorkflowSnapshot["approval"]>("getApprovalStatus");

export const timelineQuery =
  defineQuery<IncidentWorkflowSnapshot["timeline"]>("getTimeline");

export async function incidentRemediationWorkflow(
  input: IncidentWorkflowInput
): Promise<IncidentWorkflowSnapshot> {
  const workflowId = workflowInfo().workflowId;

  const snapshot: IncidentWorkflowSnapshot = {
    incidentId: input.incidentId,
    workflowId,
    status: "ANALYSING",
    timeline: []
  };

  let pendingDecision: ApprovalDecision | undefined;

  setHandler(workflowStatusQuery, () => snapshot.status);
  setHandler(workflowSnapshotQuery, () => snapshot);
  setHandler(recommendationQuery, () => snapshot.analysis);
  setHandler(approvalStatusQuery, () => snapshot.approval);
  setHandler(timelineQuery, () => snapshot.timeline);

  function acceptDecision(
    decision: ApprovalDecision
  ): void {
    if (
      snapshot.status !== "AWAITING_APPROVAL" ||
      pendingDecision ||
      !isValidApprovalDecision(decision) ||
      decision.approvalRequestId !== snapshot.approvalRequest?.id
    ) {
      return;
    }

    pendingDecision = decision;
  }

  setHandler(approvalDecisionSignal, acceptDecision);

  setHandler(approveRemediationSignal, decision => {
    if (decision?.decision === "APPROVED") {
      acceptDecision(decision);
    }
  });

  setHandler(rejectRemediationSignal, decision => {
    if (decision?.decision === "REJECTED") {
      acceptDecision(decision);
    }
  });

  async function transitionTo(
    status: WorkflowStatus,
    details?: unknown
  ): Promise<void> {
    await lifecycleActivities.recordWorkflowStatusActivity(
      input.incidentId,
      workflowId,
      status,
      details
    );

    snapshot.status = status;

    snapshot.timeline.push({
      status,
      timestamp: new Date().toISOString()
    });
  }

  try {
    const simulation = parseSimulationScenario(input.simulation);

    await transitionTo("ANALYSING");

    snapshot.analysis = await analysisActivities.analyseIncidentActivity(
      input.incidentId,
      workflowId
    );

    if (snapshot.analysis.analysisStatus === "MANUAL_INVESTIGATION") {
      await transitionTo("ESCALATED", {
        reason: "Manual investigation is required"
      });

      return snapshot;
    }

    validateRemediationAction(snapshot.analysis.recommendedAction);

    snapshot.approvalRequest =
      await lifecycleActivities.createApprovalRequestActivity(
        input.incidentId,
        workflowId,
        snapshot.analysis
      );

    await transitionTo("AWAITING_APPROVAL");

    // Temporal keeps this wait durable across worker restarts.
    await condition(() => pendingDecision !== undefined);

    const decision = pendingDecision;

    if (!decision) {
      throw new Error("Approval wait completed without a decision");
    }

    snapshot.approval =
      await lifecycleActivities.recordApprovalDecisionActivity(
        input.incidentId,
        workflowId,
        decision
      );

    if (snapshot.approval.decision === "REJECTED") {
      await transitionTo("REJECTED");

      return snapshot;
    }

    await transitionTo("APPROVED");
    await transitionTo("REMEDIATING");

    snapshot.remediation =
      await remediationActivities.executeRemediationActivity(
        input.incidentId,
        workflowId,
        snapshot.analysis.recommendedAction,
        snapshot.approval,
        simulation
      );

    if (!snapshot.remediation.success) {
      await transitionTo("ESCALATED", snapshot.remediation);

      return snapshot;
    }

    await transitionTo("VERIFYING_HEALTH");

    snapshot.health =
      await remediationActivities.verifyServiceHealthActivity(
        input.incidentId,
        workflowId
      );

    await transitionTo(
      snapshot.health.healthy ? "RESOLVED" : "ESCALATED",
      snapshot.health
    );

    return snapshot;
  } catch (error) {
    if (isCancellation(error)) {
      throw error;
    }

    snapshot.error =
      error instanceof Error ? error.message : String(error);

    await transitionTo(
      snapshot.analysis ? "ESCALATED" : "FAILED",
      { error: snapshot.error }
    );

    return snapshot;
  }
}
