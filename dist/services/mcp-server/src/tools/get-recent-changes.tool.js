"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentChangesTool = getRecentChangesTool;
const database_js_1 = require("../../../shared/src/database.js");
const tool_response_js_1 = require("../helpers/tool-response.js");
async function getRecentChangesTool(input) {
    try {
        const incidentResult = await database_js_1.database.query(`
          SELECT id, detected_at
          FROM incidents
          WHERE id = $1
        `, [input.incident_id]);
        const incident = incidentResult.rows[0];
        if (!incident) {
            return (0, tool_response_js_1.createToolError)("INCIDENT_NOT_FOUND", `Incident ${input.incident_id} was not found`);
        }
        const changesResult = await database_js_1.database.query(`
          SELECT
            id,
            resource_id,
            change_type,
            description,
            version,
            environment,
            deployed_at,
            source,
            metadata
          FROM changes
          WHERE deployed_at <= $1::timestamptz
            AND deployed_at >= (
              $1::timestamptz -
              ($2::integer * INTERVAL '1 hour')
            )
          ORDER BY deployed_at DESC
        `, [
            incident.detected_at,
            input.lookback_hours
        ]);
        return (0, tool_response_js_1.createToolResponse)({
            incident_id: incident.id,
            lookback_hours: input.lookback_hours,
            change_count: changesResult.rows.length,
            changes: changesResult.rows
        });
    }
    catch (error) {
        console.error("get_recent_changes failed:", error);
        return (0, tool_response_js_1.createToolError)("DATABASE_ERROR", "Recent changes could not be retrieved");
    }
}
