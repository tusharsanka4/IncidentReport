"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAuditedTool = runAuditedTool;
const database_js_1 = require("../../../shared/src/database.js");
async function recordToolAudit(toolName, incidentId, input, output, status) {
    await database_js_1.database.query(`
      INSERT INTO audit_events (
        incident_id,
        actor_type,
        actor_name,
        action,
        input,
        output,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
        incidentId,
        "MCP_TOOL",
        toolName,
        "TOOL_EXECUTED",
        input,
        output,
        status
    ]);
}
async function runAuditedTool(options) {
    const result = await options.handler();
    const status = result.isError === true ? "FAILED" : "SUCCESS";
    try {
        await recordToolAudit(options.toolName, status === "SUCCESS"
            ? options.incidentId ?? null
            : null, options.input, result, status);
    }
    catch (error) {
        console.error(`Could not audit ${options.toolName}:`, error);
    }
    return result;
}
