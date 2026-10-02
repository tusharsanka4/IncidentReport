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

import {
  routeAfterAnalysis,
  routeAfterCandidates,
  routeAfterIncident
} from "./routing.js";



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