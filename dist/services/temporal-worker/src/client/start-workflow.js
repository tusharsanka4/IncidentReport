"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@temporalio/client");
async function startWorkflow() {
    const incidentId = process.argv[2];
    if (!incidentId) {
        throw new Error("Provide an incident ID. Example: npm run temporal:start -- INC-1042");
    }
    const temporalAddress = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
    const namespace = process.env.TEMPORAL_NAMESPACE ?? "default";
    const taskQueue = process.env.TEMPORAL_TASK_QUEUE ??
        "manifest-incident-operations";
    const connection = await client_1.Connection.connect({
        address: temporalAddress
    });
    const client = new client_1.Client({
        connection,
        namespace
    });
    const workflowId = `incident-remediation-${incidentId}`;
    try {
        const handle = await client.workflow.start("incidentRemediationWorkflow", {
            taskQueue,
            workflowId,
            args: [
                {
                    incidentId
                }
            ]
        });
        console.log("Temporal workflow started");
        console.log(`Workflow ID: ${handle.workflowId}`);
        console.log(`Run ID: ${handle.firstExecutionRunId}`);
        console.log(`Incident ID: ${incidentId}`);
        console.log("The workflow will now analyse the incident and wait for approval.");
    }
    finally {
        await connection.close();
    }
}
startWorkflow().catch((error) => {
    console.error("Failed to start Temporal workflow:", error);
    process.exit(1);
});
