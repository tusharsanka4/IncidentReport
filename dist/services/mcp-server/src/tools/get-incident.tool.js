"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIncidentTool = getIncidentTool;
const database_js_1 = require("../../../shared/src/database.js");
const tool_response_js_1 = require("../helpers/tool-response.js");
async function getIncidentTool(input) {
    try {
        const result = await database_js_1.database.query(`
        SELECT
          id,
          service,
          environment,
          symptom,
          detected_at,
          status,
          created_at,
          updated_at
        FROM incidents
        WHERE id = $1
      `, [input.incident_id]);
        const incident = result.rows[0];
        if (!incident) {
            return (0, tool_response_js_1.createToolError)("INCIDENT_NOT_FOUND", `Incident ${input.incident_id} was not found`);
        }
        return (0, tool_response_js_1.createToolResponse)({
            incident_id: incident.id,
            service: incident.service,
            environment: incident.environment,
            symptom: incident.symptom,
            detected_at: incident.detected_at,
            status: incident.status,
            created_at: incident.created_at,
            updated_at: incident.updated_at
        });
    }
    catch (error) {
        console.error("get_incident database error:", error);
        return (0, tool_response_js_1.createToolError)("DATABASE_ERROR", "The incident could not be retrieved");
    }
}
