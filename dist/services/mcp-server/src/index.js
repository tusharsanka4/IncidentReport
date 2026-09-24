"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const database_js_1 = require("../../shared/src/database.js");
const audit_js_1 = require("./helpers/audit.js");
const get_incident_tool_js_1 = require("./tools/get-incident.tool.js");
const get_recent_changes_tool_js_1 = require("./tools/get-recent-changes.tool.js");
const get_resource_dependencies_tool_js_1 = require("./tools/get-resource-dependencies.tool.js");
const get_ranked_candidates_tool_js_1 = require("./tools/get-ranked-candidates.tool.js");
const record_analysis_result_tool_js_1 = require("./tools/record-analysis-result.tool.js");
const server = new mcp_js_1.McpServer({
    name: "manifest-incident-operations",
    version: "1.0.0"
});
/*
 * Tool 1: Get Incident
 */
server.registerTool("get_incident", {
    title: "Get Incident",
    description: "Retrieves one incident using its incident ID.",
    inputSchema: {
        incident_id: zod_1.z
            .string()
            .min(1)
            .describe("The incident ID, such as INC-1042")
    }
}, async ({ incident_id }) => {
    const input = {
        incident_id
    };
    return (0, audit_js_1.runAuditedTool)({
        toolName: "get_incident",
        incidentId: incident_id,
        input,
        handler: () => (0, get_incident_tool_js_1.getIncidentTool)(input)
    });
});
/*
 * Tool 2: Get Recent Changes
 */
server.registerTool("get_recent_changes", {
    title: "Get Recent Changes",
    description: "Retrieves changes made before an incident within a specified lookback window.",
    inputSchema: {
        incident_id: zod_1.z
            .string()
            .min(1)
            .describe("The incident ID"),
        lookback_hours: zod_1.z
            .number()
            .int()
            .min(1)
            .max(24)
            .default(6)
            .describe("How many hours before the incident to search")
    }
}, async ({ incident_id, lookback_hours }) => {
    const input = {
        incident_id,
        lookback_hours
    };
    return (0, audit_js_1.runAuditedTool)({
        toolName: "get_recent_changes",
        incidentId: incident_id,
        input,
        handler: () => (0, get_recent_changes_tool_js_1.getRecentChangesTool)(input)
    });
});
/*
 * Tool 3: Get Resource Dependencies
 */
server.registerTool("get_resource_dependencies", {
    title: "Get Resource Dependencies",
    description: "Finds direct and indirect dependencies of a resource.",
    inputSchema: {
        resource_id: zod_1.z
            .string()
            .min(1)
            .describe("The resource ID"),
        max_depth: zod_1.z
            .number()
            .int()
            .min(1)
            .max(5)
            .default(3)
            .describe("Maximum dependency depth")
    }
}, async ({ resource_id, max_depth }) => {
    const input = {
        resource_id,
        max_depth
    };
    return (0, audit_js_1.runAuditedTool)({
        toolName: "get_resource_dependencies",
        input,
        handler: () => (0, get_resource_dependencies_tool_js_1.getResourceDependenciesTool)(input)
    });
});
/*
 * Tool 4: Get Ranked Candidate Changes
 */
server.registerTool("get_ranked_candidate_changes", {
    title: "Get Ranked Candidate Changes",
    description: "Retrieves and deterministically ranks recent changes for an incident.",
    inputSchema: {
        incident_id: zod_1.z
            .string()
            .min(1),
        lookback_hours: zod_1.z
            .number()
            .int()
            .min(1)
            .max(24)
            .default(6)
    }
}, async ({ incident_id, lookback_hours }) => {
    const input = {
        incident_id,
        lookback_hours
    };
    return (0, audit_js_1.runAuditedTool)({
        toolName: "get_ranked_candidate_changes",
        incidentId: incident_id,
        input,
        handler: () => (0, get_ranked_candidates_tool_js_1.getRankedCandidatesTool)(input)
    });
});
/*
 * Tool 5: Record Analysis Result
 */
server.registerTool("record_analysis_result", {
    title: "Record Analysis Result",
    description: "Stores an evidence-based incident analysis and recommendation.",
    inputSchema: {
        incident_id: zod_1.z
            .string()
            .min(1),
        probable_change_id: zod_1.z
            .string()
            .min(1)
            .nullable(),
        confidence_score: zod_1.z
            .number()
            .min(0)
            .max(1),
        reasoning_summary: zod_1.z
            .string()
            .min(1)
            .max(2000),
        evidence: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.string().min(1),
            description: zod_1.z.string().min(1),
            score: zod_1.z.number().optional()
        })),
        recommended_action: zod_1.z.object({
            type: zod_1.z.string().min(1),
            resource: zod_1.z.string().min(1),
            from_version: zod_1.z.string().optional(),
            to_version: zod_1.z.string().optional(),
            execution: zod_1.z.string().min(1),
            requires_approval: zod_1.z.boolean()
        }),
        analysis_status: zod_1.z
            .string()
            .min(1)
    }
}, async (input) => {
    return (0, audit_js_1.runAuditedTool)({
        toolName: "record_analysis_result",
        incidentId: input.incident_id,
        input,
        handler: () => (0, record_analysis_result_tool_js_1.recordAnalysisResultTool)(input)
    });
});
/*
 * Start and stop the MCP server
 */
async function startServer() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Manifest MCP server started");
}
async function shutdown(signal) {
    console.error(`Manifest MCP server received ${signal}; shutting down`);
    await server.close();
    await database_js_1.database.end();
    process.exit(0);
}
process.on("SIGINT", () => {
    void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});
startServer().catch((error) => {
    console.error("MCP server failed to start:", error);
    process.exit(1);
});
