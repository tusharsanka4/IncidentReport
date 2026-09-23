import { database } from "../../../shared/src/database.js";

import {
  createToolError,
  createToolResponse
} from "../helpers/tool-response.js";

interface GetIncidentInput {
  incident_id: string;
}

interface IncidentRow {
  id: string;
  service: string;
  environment: string;
  symptom: string;
  detected_at: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export async function getIncidentTool(
  input: GetIncidentInput
) {
  try {
    const result = await database.query<IncidentRow>(
      `
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
      `,
      [input.incident_id]
    );

    const incident = result.rows[0];

    if (!incident) {
      return createToolError(
        "INCIDENT_NOT_FOUND",
        `Incident ${input.incident_id} was not found`
      );
    }

    return createToolResponse({
      incident_id: incident.id,
      service: incident.service,
      environment: incident.environment,
      symptom: incident.symptom,
      detected_at: incident.detected_at,
      status: incident.status,
      created_at: incident.created_at,
      updated_at: incident.updated_at
    });
  } catch (error) {
  console.error("get_incident database error:", error);

  return createToolError(
    "DATABASE_ERROR",
    "The incident could not be retrieved"
  );
}
}