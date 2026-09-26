"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadIncidentNode = loadIncidentNode;
const mcp_client_js_1 = require("../helpers/mcp-client.js");
const tool_data_js_1 = require("../helpers/tool-data.js");
async function loadIncidentNode(state) {
    try {
        const response = await (0, mcp_client_js_1.invokeMcpTool)("get_incident", {
            incident_id: state.incidentId
        });
        const incident = (0, tool_data_js_1.unwrapToolData)(response);
        if (!(0, tool_data_js_1.isRecord)(incident)) {
            throw new Error("The MCP server returned an invalid incident");
        }
        return {
            incident,
            status: "INCIDENT_LOADED",
            error: null
        };
    }
    catch (error) {
        return {
            status: "FAILED",
            error: `Unable to load incident: ${(0, tool_data_js_1.getErrorMessage)(error)}`
        };
    }
}
