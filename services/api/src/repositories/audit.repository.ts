import { database } from "../../../shared/src/database.js";

import {
  redactSensitiveData
} from "../../../shared/src/redaction.js";

interface AuditEvent {
  id: string;
  incident_id: string;
  workflow_id: string | null;
  actor_type: string;
  actor_name: string;
  action: string;
  input: unknown;
  output: unknown;
  status: string;
  timestamp: Date;
}

export async function findIncidentAuditEvents(
  incidentId: string,
  limit: number,
  offset: number
): Promise<AuditEvent[]> {
  const result = await database.query<AuditEvent>(
    `
      SELECT
        id, incident_id, workflow_id, actor_type, actor_name,
        action, input, output, status, timestamp
      FROM audit_events
      WHERE incident_id = $1
      ORDER BY timestamp ASC, id ASC
      LIMIT $2 OFFSET $3
    `,
    [incidentId, limit, offset]
  );

  return result.rows.map(event => ({
    ...event,
    input: redactSensitiveData(event.input),
    output: redactSensitiveData(event.output)
  }));
}
