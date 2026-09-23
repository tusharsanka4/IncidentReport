"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const database_js_1 = require("../../shared/src/database.js");
const get_incident_tool_js_1 = require("./tools/get-incident.tool.js");
const get_recent_changes_tool_js_1 = require("./tools/get-recent-changes.tool.js");
const get_resource_dependencies_tool_js_1 = require("./tools/get-resource-dependencies.tool.js");
const server = new mcp_js_1.McpServer({
    name: "manifest-incident-operations",
    version: "1.0.0"
});
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
    return (0, get_incident_tool_js_1.getIncidentTool)({
        incident_id
    });
});
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
    return (0, get_recent_changes_tool_js_1.getRecentChangesTool)({
        incident_id,
        lookback_hours
    });
});
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
    return (0, get_resource_dependencies_tool_js_1.getResourceDependenciesTool)({
        resource_id,
        max_depth
    });
});
