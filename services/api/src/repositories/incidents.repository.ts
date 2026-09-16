import { database } from "../../../shared/src/database.js";

import type {
  CreateIncidentInput,
  Incident
} from "../types/incident.types.js";

export async function createIncident(
  input: CreateIncidentInput
): Promise<Incident> {
  const result = await database.query<Incident>(
    `
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
    `,
    [
      input.incident_id,
      input.service,
      input.environment,
      input.symptom,
      input.detected_at
    ]
  );

  const incident = result.rows[0];

  if (!incident) {
    throw new Error("Incident was not returned after insertion");
  }

  return incident;
}

export async function findIncidentById(
  incidentId: string
): Promise<Incident | null> {
  const result = await database.query<Incident>(
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
    [incidentId]
  );

  return result.rows[0] ?? null;
}

export async function findAllIncidents(): Promise<Incident[]> {
  const result = await database.query<Incident>(
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
      ORDER BY detected_at DESC
    `
  );

  return result.rows;
}