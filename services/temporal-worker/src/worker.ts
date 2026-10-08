import "dotenv/config";

import {
  NativeConnection,
  Worker
} from "@temporalio/worker";

import * as activities from "./activities/index.js";

import { database } from "../../shared/src/database.js";
import { closeMcpClient } from "../../agent/src/helpers/mcp-client.js";

async function startWorker(): Promise<void> {
  const temporalAddress =
    process.env.TEMPORAL_ADDRESS ?? "localhost:7233";

  const namespace =
    process.env.TEMPORAL_NAMESPACE ?? "default";

  const taskQueue =
    process.env.TEMPORAL_TASK_QUEUE ??
    "manifest-incident-operations";

  const workflowsPath = require.resolve(
    "./workflows/index"
  );

  const connection =
    await NativeConnection.connect({
      address: temporalAddress
    });

  console.log(
    `Connected to Temporal at ${temporalAddress}`
  );

  try {
    const worker = await Worker.create({
      connection,
      namespace,
      taskQueue,
      workflowsPath,
      activities
    });

    console.log(
      `Temporal worker listening on task queue: ${taskQueue}`
    );

    await worker.run();
  } finally {
    await closeMcpClient();
    await database.end();
    await connection.close();
  }
}

startWorker().catch((error: unknown) => {
  console.error(
    "Temporal worker failed to start:",
    error
  );

  process.exit(1);
});
