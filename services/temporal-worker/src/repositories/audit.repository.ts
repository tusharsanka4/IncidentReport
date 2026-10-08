import type { PoolClient } from "pg";

import {
  redactSensitiveData
} from "../../../shared/src/redaction.js";

interface WorkflowAuditInput {
  incidentId: string;
  workflowId: string;
  eventKey: string;
  actorType: string;
  actorName: string;
  action: string;
  input?: unknown;
  output?: unknown;
  status: string;
}

export async function recordWorkflowAudit(
  client: PoolClient,
  event: WorkflowAuditInput
): Promise<void> {
  await client.query(
    `
      INSERT INTO audit_events (
        incident_id, workflow_id, event_key,
        actor_type, actor_name, action,
        input, output, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
      ON CONFLICT (event_key) DO NOTHING
    `,
    [
      event.incidentId,
      event.workflowId,
      event.eventKey,
      event.actorType,
      event.actorName,
      event.action,
      JSON.stringify(redactSensitiveData(event.input ?? null)),
      JSON.stringify(redactSensitiveData(event.output ?? null)),
      event.status
    ]
  );
}
