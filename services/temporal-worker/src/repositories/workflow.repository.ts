import { ApplicationFailure } from "@temporalio/activity";

import type { WorkflowStatus } from "../shared.types.js";

import { withTransaction } from "./transaction.js";
import { recordWorkflowAudit } from "./audit.repository.js";

export async function recordWorkflowStatus(
  incidentId: string,
  workflowId: string,
  status: WorkflowStatus,
  details?: unknown
): Promise<void> {
  await withTransaction(async client => {
    const incident = await client.query(
      "SELECT id FROM incidents WHERE id = $1 FOR UPDATE",
      [incidentId]
    );

    if (incident.rowCount === 0) {
      throw ApplicationFailure.nonRetryable(
        `Incident ${incidentId} was not found`,
        "INCIDENT_NOT_FOUND"
      );
    }

    const eventKey = `${workflowId}:status:${status}`;

    const existingEvent = await client.query(
      "SELECT id FROM audit_events WHERE event_key = $1",
      [eventKey]
    );

    if (existingEvent.rowCount !== 0) {
      return;
    }

    await client.query(
      `
        UPDATE incidents
        SET status = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [incidentId, status]
    );

    await recordWorkflowAudit(client, {
      incidentId,
      workflowId,
      eventKey,
      actorType: "TEMPORAL_WORKFLOW",
      actorName: "incidentRemediationWorkflow",
      action: "WORKFLOW_STATUS_CHANGED",
      output: { status, details },
      status
    });
  });
}
