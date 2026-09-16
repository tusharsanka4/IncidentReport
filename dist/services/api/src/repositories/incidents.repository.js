"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIncident = createIncident;
exports.findIncidentById = findIncidentById;
exports.findAllIncidents = findAllIncidents;
const database_js_1 = require("../../../shared/src/database.js");
async function createIncident(input) {
    const result = await database_js_1.database.query(`
      INSERT INTO incidents (
        id,
        service,
        environment,
        symptom,
        detected_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        service,
        environment,
        symptom,
        detected_at,
        status,
        created_at,
        updated_at
    `, [
        input.incident_id,
        input.service,
        input.environment,
        input.symptom,
        input.detected_at
    ]);
    const incident = result.rows[0];
    if (!incident) {
        throw new Error("Incident was not returned after insertion");
    }
    return incident;
}
async function findIncidentById(incidentId) {
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
    `, [incidentId]);
    return result.rows[0] ?? null;
}
async function findAllIncidents() {
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
      ORDER BY detected_at DESC
    `);
    return result.rows;
}
