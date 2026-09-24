"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRankedCandidatesTool = getRankedCandidatesTool;
const database_js_1 = require("../../../shared/src/database.js");
const candidate_ranking_js_1 = require("../../../shared/src/candidate-ranking.js");
const tool_response_js_1 = require("../helpers/tool-response.js");
async function getRankedCandidatesTool(input) {
    try {
        const incidentResult = await database_js_1.database.query(`
          SELECT
            id,
            service,
            environment,
            detected_at
          FROM incidents
          WHERE id = $1
        `, [input.incident_id]);
        const incident = incidentResult.rows[0];
        if (!incident) {
            return (0, tool_response_js_1.createToolError)("INCIDENT_NOT_FOUND", `Incident ${input.incident_id} was not found`);
        }
        const [changesResult, relationshipsResult] = await Promise.all([
            database_js_1.database.query(`
            SELECT
              id,
              resource_id,
              change_type,
              description,
              version,
              environment,
              deployed_at,
              source,
              metadata,
              created_at
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
            ]),
            database_js_1.database.query(`
            SELECT
              source_resource_id AS source,
              target_resource_id AS target,
              relationship_type AS type
            FROM resource_relationships
          `)
        ]);
        const candidates = (0, candidate_ranking_js_1.rankCandidateChanges)(incident, changesResult.rows, relationshipsResult.rows);
        return (0, tool_response_js_1.createToolResponse)({
            incident_id: incident.id,
            affected_service: incident.service,
            environment: incident.environment,
            candidate_count: candidates.length,
            candidates
        });
    }
    catch (error) {
        console.error("get_ranked_candidate_changes failed:", error);
        return (0, tool_response_js_1.createToolError)("RANKING_ERROR", "Candidate changes could not be ranked");
    }
}
