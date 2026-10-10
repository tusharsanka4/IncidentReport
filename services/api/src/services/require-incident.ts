import { ApiError } from "../errors/api-error.js";

import {
  findIncidentById
} from "../repositories/incidents.repository.js";

import type { Incident } from "../types/incident.types.js";

export async function requireIncident(
  incidentId: string
): Promise<Incident> {
  const incident = await findIncidentById(incidentId);

  if (!incident) {
    throw new ApiError(
      404,
      "INCIDENT_NOT_FOUND",
      `Incident ${incidentId} was not found`
    );
  }

  return incident;
}
