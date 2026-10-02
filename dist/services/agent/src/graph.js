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
const routing_js_1 = require("./routing.js");
exports.incidentAnalysisGraph = new langgraph_1.StateGraph(agent_state_js_1.AgentState)
    .addNode("loadIncident", load_incident_node_js_1.loadIncidentNode)
    .addNode("loadCandidates", load_candidates_node_js_1.loadCandidatesNode)
    .addNode("analyseIncident", analyse_incident_node_js_1.analyseIncidentNode)
    .addNode("manualInvestigation", manual_investigation_node_js_1.manualInvestigationNode)
    .addNode("recordAnalysis", record_analysis_node_js_1.recordAnalysisNode)
    .addEdge(langgraph_1.START, "loadIncident")
    .addConditionalEdges("loadIncident", routing_js_1.routeAfterIncident)
    .addConditionalEdges("loadCandidates", routing_js_1.routeAfterCandidates)
    .addConditionalEdges("analyseIncident", routing_js_1.routeAfterAnalysis)
    .addEdge("manualInvestigation", "recordAnalysis")
    .addEdge("recordAnalysis", langgraph_1.END)
    .compile();
