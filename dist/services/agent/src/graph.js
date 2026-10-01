"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentAnalysisGraph = void 0;
const langgraph_1 = require("@langchain/langgraph");
const agent_state_js_1 = require("./agent-state.js");
const load_incident_node_js_1 = require("./nodes/load-incident.node.js");
const load_candidates_node_js_1 = require("./nodes/load-candidates.node.js");
const analyse_incident_node_js_1 = require("./nodes/analyse-incident.node.js");
const manual_investigation_node_js_1 = require("./nodes/manual-investigation.node.js");
const record_analysis_node_js_1 = require("./nodes/record-analysis.node.js");
const MINIMUM_CONFIDENCE = 0.65;
const SUPPORTED_ACTIONS = new Set([
    "ROLLBACK",
    "CONFIGURATION_REVERT",
    "RESTART"
]);
function routeAfterIncident(state) {
    if (state.status === "FAILED" ||
        !state.incident) {
        return langgraph_1.END;
    }
    return "loadCandidates";
}
function routeAfterCandidates(state) {
    if (state.status === "FAILED") {
        return langgraph_1.END;
    }
    if (state.candidates.length === 0) {
        return "manualInvestigation";
    }
    return "analyseIncident";
}
function routeAfterAnalysis(state) {
    if (state.status === "RETRYING") {
        return "analyseIncident";
    }
    if (state.status === "FAILED" ||
        !state.analysis) {
        return "manualInvestigation";
    }
    if (state.analysis.confidence_score <
        MINIMUM_CONFIDENCE) {
        return "manualInvestigation";
    }
    if (state.analysis.analysis_status ===
        "MANUAL_INVESTIGATION") {
        return "manualInvestigation";
    }
    if (!SUPPORTED_ACTIONS.has(state.analysis
        .recommended_action.type)) {
        return "manualInvestigation";
    }
    return "recordAnalysis";
}
exports.incidentAnalysisGraph = new langgraph_1.StateGraph(agent_state_js_1.AgentState)
    .addNode("loadIncident", load_incident_node_js_1.loadIncidentNode)
    .addNode("loadCandidates", load_candidates_node_js_1.loadCandidatesNode)
    .addNode("analyseIncident", analyse_incident_node_js_1.analyseIncidentNode)
    .addNode("manualInvestigation", manual_investigation_node_js_1.manualInvestigationNode)
    .addNode("recordAnalysis", record_analysis_node_js_1.recordAnalysisNode)
    .addEdge(langgraph_1.START, "loadIncident")
    .addConditionalEdges("loadIncident", routeAfterIncident)
    .addConditionalEdges("loadCandidates", routeAfterCandidates)
    .addConditionalEdges("analyseIncident", routeAfterAnalysis)
    .addEdge("manualInvestigation", "recordAnalysis")
    .addEdge("recordAnalysis", langgraph_1.END)
    .compile();
