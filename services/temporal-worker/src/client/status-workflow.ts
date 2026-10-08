import type {
  IncidentWorkflow,
  IncidentWorkflowSnapshot
} from "../shared.types.js";

import {
  getIncidentWorkflowId,
  withWorkflowClient
} from "./workflow-client.js";

async function inspectWorkflow(): Promise<void> {
  const incidentId = process.argv[2];

  if (!incidentId?.trim()) {
    throw new Error(
      "Usage: npm run temporal:status -- <incident-id>"
    );
  }

  await withWorkflowClient(async client => {
    const handle = client.workflow.getHandle<IncidentWorkflow>(
      getIncidentWorkflowId(incidentId)
    );

    const description = await handle.describe();

    const snapshot = description.status.name === "COMPLETED"
      ? await handle.result()
      : await handle.query<IncidentWorkflowSnapshot>("workflowSnapshot");

    console.log(JSON.stringify(snapshot, null, 2));

    if (
      process.argv.includes("--wait") &&
      description.status.name !== "COMPLETED"
    ) {
      console.log(
        JSON.stringify(await handle.result(), null, 2)
      );
    }
  });
}

inspectWorkflow().catch((error: unknown) => {
  console.error("Failed to inspect workflow:", error);
  process.exitCode = 1;
});
