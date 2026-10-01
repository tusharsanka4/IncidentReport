import {
  END,
  START,
  StateGraph
} from "@langchain/langgraph";

import {
  AgentState
} from "./agent-state.js";

import {
  loadIncidentNode
} from "./nodes/load-incident.node.js";

import {
  loadCandidatesNode
} from "./nodes/load-candidates.node.js";

import {
  analyseIncidentNode
} from "./nodes/analyse-incident.node.js";

import {
  manualInvestigationNode
} from "./nodes/manual-investigation.node.js";

import {
  recordAnalysisNode
} from "./nodes/record-analysis.node.js";

import type {
  IncidentAgentState
} from "./agent-state.js";

const MINIMUM_CONFIDENCE = 0.65;

const SUPPORTED_ACTIONS = new Set([
  "ROLLBACK",
  "CONFIGURATION_REVERT",
  "RESTART"
]);

function routeAfterIncident(
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

function routeAfterCandidates(
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

function routeAfterAnalysis(
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

export const incidentAnalysisGraph =
  new StateGraph(AgentState)
    .addNode(
      "loadIncident",
      loadIncidentNode
    )
    .addNode(
      "loadCandidates",
      loadCandidatesNode
    )
    .addNode(
      "analyseIncident",
      analyseIncidentNode
    )
    .addNode(
      "manualInvestigation",
      manualInvestigationNode
    )
    .addNode(
      "recordAnalysis",
      recordAnalysisNode
    )

    .addEdge(
      START,
      "loadIncident"
    )

    .addConditionalEdges(
      "loadIncident",
      routeAfterIncident
    )

    .addConditionalEdges(
      "loadCandidates",
      routeAfterCandidates
    )

    .addConditionalEdges(
      "analyseIncident",
      routeAfterAnalysis
    )

    .addEdge(
      "manualInvestigation",
      "recordAnalysis"
    )

    .addEdge(
      "recordAnalysis",
      END
    )

    .compile();