import "dotenv/config";

import {
  NativeConnection,
  Worker
} from "@temporalio/worker";

import * as activities from "./activities/index.js";

import { database, checkDatabaseHealth } from "../../shared/src/database.js";
import { closeMcpClient } from "../../agent/src/helpers/mcp-client.js";
import { checkTemporalHealth } from "../../shared/src/temporal-health.js";
import { createWorkerHealthServer } from "./health.js";

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

  let health: ReturnType<typeof createWorkerHealthServer> | undefined;

  try {
    const worker = await Worker.create({
      connection,
      namespace,
      taskQueue,
      workflowsPath,
      activities
    });

    health = createWorkerHealthServer({
      status: () => worker.getStatus(),
      checkDatabase: checkDatabaseHealth,
      checkTemporal: checkTemporalHealth
    });
    await new Promise<void>((resolve, reject) => {
      health!.once("error", reject);
      health!.listen(Number(process.env.WORKER_HEALTH_PORT ?? 3001), "0.0.0.0", resolve);
    });

    console.log(
      `Temporal worker listening on task queue: ${taskQueue}`
    );

    await worker.run();
  } finally {
    if (health) {
      health.closeAllConnections();
      await new Promise<void>(resolve => health!.close(() => resolve()));
    }
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
