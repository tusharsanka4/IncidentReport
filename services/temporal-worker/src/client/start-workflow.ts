import {
  WorkflowExecutionAlreadyStartedError
} from "@temporalio/client";

import {
  parseSimulationScenario
} from "../remediation-policy.js";

import {
  getIncidentWorkflowId,
  withWorkflowClient
} from "./workflow-client.js";

async function startWorkflow(): Promise<void> {
  const incidentId = process.argv[2];

  if (!incidentId?.trim()) {
    throw new Error(
      "Usage: npm run temporal:start -- <incident-id> " +
      "[SUCCESS|REMEDIATION_FAILURE|UNHEALTHY]"
    );
  }

  const simulation = parseSimulationScenario(
    process.argv[3]?.toUpperCase()
  );

  await withWorkflowClient(async client => {
    const workflowId = getIncidentWorkflowId(incidentId);

    try {
      const handle = await client.workflow.start(
        "incidentRemediationWorkflow",
        {
          taskQueue: process.env.TEMPORAL_TASK_QUEUE ??
            "manifest-incident-operations",
          workflowId,
          workflowIdReusePolicy: "REJECT_DUPLICATE",
          args: [{ incidentId, simulation }]
        }
      );

      console.log("Temporal workflow started");
      console.log(`Workflow ID: ${handle.workflowId}`);
      console.log(`Run ID: ${handle.firstExecutionRunId}`);
      console.log(`Simulation scenario: ${simulation}`);
    } catch (error) {
      if (!(error instanceof WorkflowExecutionAlreadyStartedError)) {
        throw error;
      }

      console.log(`Workflow already exists: ${workflowId}`);
      console.log(
        `Inspect it with: npm run temporal:status -- ${incidentId}`
      );
    }
  });
}

startWorkflow().catch((error: unknown) => {
  console.error("Failed to start Temporal workflow:", error);
  process.exitCode = 1;
});
