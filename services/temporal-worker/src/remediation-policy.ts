import {
  RecommendedActionSchema
} from "../../agent/src/analysis-output.js";

import type {
  ApprovalDecision,
  RecommendedAction,
  SimulationScenario
} from "./shared.types.js";

export function isValidApprovalDecision(
  decision: ApprovalDecision
): boolean {
  return (
    decision !== null &&
    typeof decision === "object" &&
    (decision.decision === "APPROVED" ||
      decision.decision === "REJECTED") &&
    typeof decision.approvalRequestId === "string" &&
    decision.approvalRequestId.trim().length > 0 &&
    typeof decision.decidedBy === "string" &&
    decision.decidedBy.trim().length > 0 &&
    typeof decision.decidedAt === "string" &&
    Number.isFinite(Date.parse(decision.decidedAt)) &&
    (decision.comment === undefined ||
      typeof decision.comment === "string")
  );
}

export function validateRemediationAction(
  action: RecommendedAction
): void {
  RecommendedActionSchema.parse(action);

  if (
    action.requires_approval !== true ||
    action.execution !== "HUMAN_APPROVAL_REQUIRED"
  ) {
    throw new Error(
      "Remediation requires explicit human approval"
    );
  }

  if (action.type === "MANUAL_INVESTIGATION") {
    throw new Error(
      "Manual investigation is not an executable remediation"
    );
  }

  if (
    action.type === "ROLLBACK" &&
    (
      !action.from_version?.trim() ||
      !action.to_version?.trim() ||
      action.from_version === action.to_version
    )
  ) {
    throw new Error(
      "A rollback requires distinct known source and target versions"
    );
  }
}

export function parseSimulationScenario(
  value: string | undefined
): SimulationScenario {
  if (value === undefined) {
    return "SUCCESS";
  }

  if (
    value !== "SUCCESS" &&
    value !== "REMEDIATION_FAILURE" &&
    value !== "UNHEALTHY"
  ) {
    throw new Error(
      "Simulation must be SUCCESS, REMEDIATION_FAILURE, or UNHEALTHY"
    );
  }

  return value;
}
