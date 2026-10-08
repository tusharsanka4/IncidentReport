import { ApplicationFailure } from "@temporalio/activity";

import type {
  RemediationResult,
  ServiceHealthResult,
  SimulationScenario
} from "../shared.types.js";

import { simulateServiceHealth } from "../simulation.js";
import { withTransaction } from "../repositories/transaction.js";
import { recordWorkflowAudit } from "../repositories/audit.repository.js";

export async function verifyServiceHealthActivity(
  incidentId: string,
  workflowId: string
): Promise<ServiceHealthResult> {
  return withTransaction(async client => {
    const attempt = await client.query<{
      result: RemediationResult;
      simulation: SimulationScenario;
      health_result: ServiceHealthResult | null;
    }>(
      `
        SELECT result, simulation, health_result
        FROM remediation_attempts
        WHERE workflow_id = $1 AND incident_id = $2
        FOR UPDATE
      `,
      [workflowId, incidentId]
    );

    const row = attempt.rows[0];

    if (!row || !row.result.success) {
      throw ApplicationFailure.nonRetryable(
        "Health verification requires a successful remediation attempt",
        "REMEDIATION_NOT_COMPLETED"
      );
    }

    if (row.health_result) {
      return row.health_result;
    }

    const health = simulateServiceHealth(
      row.result,
      row.simulation,
      new Date().toISOString()
    );

    await client.query(
      `
        UPDATE remediation_attempts
        SET health_result = $2::jsonb
        WHERE workflow_id = $1
      `,
      [workflowId, JSON.stringify(health)]
    );

    await recordWorkflowAudit(client, {
      incidentId,
      workflowId,
      eventKey: `${workflowId}:health`,
      actorType: "TEMPORAL_ACTIVITY",
      actorName: "verifyServiceHealthActivity",
      action: "HEALTH_VERIFIED",
      output: health,
      status: health.healthy ? "HEALTHY" : "UNHEALTHY"
    });

    return health;
  });
}
