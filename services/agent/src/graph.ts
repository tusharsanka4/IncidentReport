import {
  END,
  START,
  StateGraph
} from "@langchain/langgraph";

import {
  AgentState
} from "./agent-state.js";
import type { invokeMcpTool } from "./helpers/mcp-client.js";
import type { analysisModel } from "./model.js";

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



export function createIncidentAnalysisGraph(dependencies: {
  invokeTool?: typeof invokeMcpTool;
  model?: Pick<typeof analysisModel, "invoke">;
} = {}) {
  return new StateGraph(AgentState)
    .addNode(
      "loadIncident",
      state => loadIncidentNode(state, dependencies.invokeTool)
    )
    .addNode(
      "loadCandidates",
      state => loadCandidatesNode(state, dependencies.invokeTool)
    )
    .addNode(
      "analyseIncident",
      state => analyseIncidentNode(state, dependencies.model)
    )
    .addNode(
      "manualInvestigation",
      manualInvestigationNode
    )
    .addNode(
      "recordAnalysis",
      state => recordAnalysisNode(state, dependencies.invokeTool)
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
}

export const incidentAnalysisGraph = createIncidentAnalysisGraph();
