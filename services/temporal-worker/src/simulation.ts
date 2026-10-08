import type {
  RecommendedAction,
  RemediationResult,
  ServiceHealthResult,
  SimulationScenario
} from "./shared.types.js";

import {
  validateRemediationAction
} from "./remediation-policy.js";

export function simulateRemediation(
  action: RecommendedAction,
  scenario: SimulationScenario,
  completedAt: string
): RemediationResult {
  validateRemediationAction(action);

  if (scenario === "REMEDIATION_FAILURE") {
    return {
      success: false,
      simulated: true,
      action: action.type,
      resource: action.resource,
      message: "Controlled simulated remediation failure.",
      completedAt
    };
  }

  let message: string;

  switch (action.type) {
    case "ROLLBACK":
      message =
        `Simulated rollback of ${action.resource}` +
        ` from ${action.from_version} to ${action.to_version}.`;
      break;

    case "CONFIGURATION_REVERT":
      message =
        `Simulated configuration revert for ${action.resource}.`;
      break;

    case "RESTART":
      message = `Simulated restart of ${action.resource}.`;
      break;

    default:
      throw new Error("Unsupported remediation type");
  }

  return {
    success: true,
    simulated: true,
    action: action.type,
    resource: action.resource,
    message,
    completedAt
  };
}

export function simulateServiceHealth(
  remediation: RemediationResult,
  scenario: SimulationScenario,
  checkedAt: string
): ServiceHealthResult {
  const healthy =
    remediation.success && scenario === "SUCCESS";

  return {
    healthy,
    simulated: true,
    resource: remediation.resource,
    message: healthy
      ? "Simulated service health recovered after remediation."
      : "Simulated service health remains degraded.",
    checkedAt
  };
}
