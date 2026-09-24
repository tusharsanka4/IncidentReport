import { database } from "../../../shared/src/database.js";
import {
  rankCandidateChanges
} from "../../../shared/src/candidate-ranking.js";

import type {
  Change
} from "../../../shared/src/change.types.js";

import type {
  ResourceRelationship
} from "../../../shared/src/architecture.types.js";

import {
  createToolError,
  createToolResponse
} from "../helpers/tool-response.js";

interface GetRankedCandidatesInput {
  incident_id: string;
  lookback_hours: number;
}

interface IncidentRow {
  id: string;
  service: string;
  environment: string;
  detected_at: Date;
}

export async function getRankedCandidatesTool(
  input: GetRankedCandidatesInput
) {
  try {
    const incidentResult =
      await database.query<IncidentRow>(
        `
          SELECT
            id,
            service,
            environment,
            detected_at
          FROM incidents
          WHERE id = $1
        `,
        [input.incident_id]
      );

    const incident = incidentResult.rows[0];

    if (!incident) {
      return createToolError(
        "INCIDENT_NOT_FOUND",
        `Incident ${input.incident_id} was not found`
      );
    }

    const [changesResult, relationshipsResult] =
      await Promise.all([
        database.query<Change>(
          `
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
          `,
          [
            incident.detected_at,
            input.lookback_hours
          ]
        ),

        database.query<ResourceRelationship>(
          `
            SELECT
              source_resource_id AS source,
              target_resource_id AS target,
              relationship_type AS type
            FROM resource_relationships
          `
        )
      ]);

    const candidates = rankCandidateChanges(
      incident,
      changesResult.rows,
      relationshipsResult.rows
    );

    return createToolResponse({
      incident_id: incident.id,
      affected_service: incident.service,
      environment: incident.environment,
      candidate_count: candidates.length,
      candidates
    });
  } catch (error) {
    console.error(
      "get_ranked_candidate_changes failed:",
      error
    );

    return createToolError(
      "RANKING_ERROR",
      "Candidate changes could not be ranked"
    );
  }
}