import {
  END
} from "@langchain/langgraph";

import type {
  IncidentAgentState
} from "./agent-state.js";

const MINIMUM_CONFIDENCE = 0.65;

const SUPPORTED_ACTIONS = new Set([
  "ROLLBACK",
  "CONFIGURATION_REVERT",
  "RESTART"
]);

export function routeAfterIncident(
  state: IncidentAgentState
): "loadCandidates" | typeof END {
  if (
    state.status === "FAILED" ||
    !state.incident
  ) {
    return END;
  }

  return "loadCandidates";
}

export function routeAfterCandidates(
  state: IncidentAgentState
):
  | "analyseIncident"
  | "manualInvestigation"
  | typeof END {
  if (state.status === "FAILED") {
    return END;
  }

  if (state.candidates.length === 0) {
    return "manualInvestigation";
  }

  return "analyseIncident";
}

export function routeAfterAnalysis(
  state: IncidentAgentState
):
  | "analyseIncident"
  | "manualInvestigation"
  | "recordAnalysis" {
  if (state.status === "RETRYING") {
    return "analyseIncident";
  }

  if (
    state.status === "FAILED" ||
    !state.analysis
  ) {
    return "manualInvestigation";
  }

  if (
    state.analysis.confidence_score <
    MINIMUM_CONFIDENCE
  ) {
    return "manualInvestigation";
  }

  if (
    state.analysis.analysis_status ===
    "MANUAL_INVESTIGATION"
  ) {
    return "manualInvestigation";
  }

  if (
    !SUPPORTED_ACTIONS.has(
      state.analysis
        .recommended_action.type
    )
  ) {
    return "manualInvestigation";
  }

  return "recordAnalysis";
}