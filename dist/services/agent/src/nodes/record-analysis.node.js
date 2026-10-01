"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAnalysisNode = recordAnalysisNode;
const mcp_client_js_1 = require("../helpers/mcp-client.js");
const tool_data_js_1 = require("../helpers/tool-data.js");
async function recordAnalysisNode(state) {
    if (!state.analysis) {
        return {
            status: "FAILED",
            error: "No analysis result is available to record"
        };
    }
    try {
        await (0, mcp_client_js_1.invokeMcpTool)("record_analysis_result", {
            incident_id: state.incidentId,
            probable_change_id: state.analysis
                .probable_change_id,
            confidence_score: state.analysis
                .confidence_score,
            reasoning_summary: state.analysis
                .reasoning_summary,
            evidence: state.analysis.evidence,
            recommended_action: state.analysis
                .recommended_action,
            analysis_status: state.analysis
                .analysis_status
        });
        return {
            status: state.analysis.analysis_status ===
                "MANUAL_INVESTIGATION"
                ? "MANUAL_INVESTIGATION"
                : "AWAITING_APPROVAL",
            error: null
        };
    }
    catch (error) {
        return {
            status: "FAILED",
            error: `Unable to record analysis: ${(0, tool_data_js_1.getErrorMessage)(error)}`
        };
    }
}
