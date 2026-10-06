"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyseIncidentActivity = analyseIncidentActivity;
const graph_js_1 = require("../../../agent/src/graph.js");
async function analyseIncidentActivity(incidentId) {
    console.log(`Temporal activity analysing ${incidentId}`);
    const result = await graph_js_1.incidentAnalysisGraph.invoke({
        incidentId,
        incident: null,
        candidates: [],
        analysis: null,
        status: "STARTED",
        error: null,
        retryCount: 0,
        maxRetries: 2
    });
    if (result.status === "FAILED" ||
        !result.analysis) {
        throw new Error(result.error ??
            `Incident analysis failed for ${incidentId}`);
    }
    return {
        incidentId,
        probableChangeId: result.analysis
            .probable_change_id,
        confidenceScore: result.analysis
            .confidence_score,
        reasoningSummary: result.analysis
            .reasoning_summary,
        recommendedAction: result.analysis
            .recommended_action,
        analysisStatus: result.analysis
            .analysis_status
    };
}
