"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCandidatesNode = loadCandidatesNode;
const mcp_client_js_1 = require("../helpers/mcp-client.js");
const tool_data_js_1 = require("../helpers/tool-data.js");
async function loadCandidatesNode(state) {
    try {
        const response = await (0, mcp_client_js_1.invokeMcpTool)("get_ranked_candidate_changes", {
            incident_id: state.incidentId,
            lookback_hours: 6
        });
        const result = (0, tool_data_js_1.unwrapToolData)(response);
        if (!(0, tool_data_js_1.isRecord)(result)) {
            throw new Error("The MCP server returned an invalid candidate response");
        }
        const candidates = result.candidates;
        if (!Array.isArray(candidates)) {
            throw new Error("The candidate response does not contain a candidates array");
        }
        const validCandidates = candidates.filter(tool_data_js_1.isRecord);
        if (validCandidates.length !==
            candidates.length) {
            throw new Error("One or more candidates have an invalid structure");
        }
        return {
            candidates: validCandidates,
            status: "CANDIDATES_LOADED",
            error: null
        };
    }
    catch (error) {
        return {
            status: "FAILED",
            error: `Unable to load candidates: ${(0, tool_data_js_1.getErrorMessage)(error)}`
        };
    }
}
