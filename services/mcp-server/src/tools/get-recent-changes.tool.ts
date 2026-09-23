import { database } from "../../../shared/src/database.js";

import {
  createToolError,
  createToolResponse
} from "../helpers/tool-response.js";

interface GetRecentChangesInput {
  incident_id: string;
  lookback_hours: number;
}

interface IncidentRow {
  id: string;
  detected_at: Date;
}

interface ChangeRow {
  id: string;
  resource_id: string;
  change_type: string;
  description: string | null;
  version: string | null;
  environment: string;
  deployed_at: Date;
  source: string | null;
  metadata: Record<string, unknown>;
}

export async function getRecentChangesTool(
  input: GetRecentChangesInput
) {
  try {
    const incidentResult =
      await database.query<IncidentRow>(
        `
          SELECT id, detected_at
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

    const changesResult =
      await database.query<ChangeRow>(
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
            metadata
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
      );

    return createToolResponse({
      incident_id: incident.id,
      lookback_hours: input.lookback_hours,
      change_count: changesResult.rows.length,
      changes: changesResult.rows
    });
  } catch (error) {
    console.error("get_recent_changes failed:", error);

    return createToolError(
      "DATABASE_ERROR",
      "Recent changes could not be retrieved"
    );
  }
}