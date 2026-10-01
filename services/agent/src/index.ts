import "dotenv/config";

import {
  incidentAnalysisGraph
} from "./graph.js";

async function run(): Promise<void> {
  const incidentId = process.argv[2];

  if (!incidentId) {
    console.error(
      "Usage: npm run agent -- <incident-id>"
    );

    process.exitCode = 1;
    return;
  }

  console.error(
    `Starting analysis for ${incidentId}...`
  );

  const result =
    await incidentAnalysisGraph.invoke({
      incidentId,

      incident: null,

      candidates: [],

      analysis: null,

      status: "STARTED",

      error: null,

      retryCount: 0,

      maxRetries: 2
    });

  console.log(
    JSON.stringify(result, null, 2)
  );

  if (result.status === "FAILED") {
    process.exitCode = 1;
  }
}

run().catch((error: unknown) => {
  console.error(
    "Incident analysis failed:",
    error
  );

  process.exitCode = 1;
});