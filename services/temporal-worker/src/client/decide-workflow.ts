import type {
  IncidentWorkflow
} from "../shared.types.js";

import {
  getIncidentWorkflowId,
  withWorkflowClient
} from "./workflow-client.js";

import {
  submitApprovalDecision
} from "./submit-decision.js";

async function decideWorkflow(): Promise<void> {
  const argumentsList = process.argv.slice(2).filter(
    argument => argument !== "--wait"
  );

  const [incidentId, rawDecision, decidedBy, comment] =
    argumentsList;

  if (!incidentId?.trim() || !decidedBy?.trim()) {
    throw new Error(
      "Usage: npm run temporal:decide -- <incident-id> " +
      "<APPROVED|REJECTED> <approver> [comment] [--wait]"
    );
  }

  const decision = rawDecision?.toUpperCase();

  if (decision !== "APPROVED" && decision !== "REJECTED") {
    throw new Error("Decision must be APPROVED or REJECTED");
  }

  await withWorkflowClient(async client => {
    const handle = client.workflow.getHandle<
      IncidentWorkflow
    >(getIncidentWorkflowId(incidentId));

    const submitted = await submitApprovalDecision(
      handle,
      decision,
      decidedBy,
      comment
    );

    console.log(
      submitted
        ? `${decision} signal submitted successfully`
        : `${decision} decision was already recorded`
    );

    console.log(`Workflow ID: ${handle.workflowId}`);
    console.log(`Decided by: ${decidedBy}`);

    if (process.argv.includes("--wait")) {
      const result = await handle.result();

      console.log(JSON.stringify(result, null, 2));
    }
  });
}

decideWorkflow().catch((error: unknown) => {
  console.error("Failed to send approval decision:", error);
  process.exitCode = 1;
});
