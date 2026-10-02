"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeAfterIncident = routeAfterIncident;
exports.routeAfterCandidates = routeAfterCandidates;
exports.routeAfterAnalysis = routeAfterAnalysis;
const langgraph_1 = require("@langchain/langgraph");
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
