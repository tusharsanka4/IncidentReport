import { Connection } from "@temporalio/client";
import { temporalConnectionOptions } from "./temporal-connection.js";

/** A bounded gRPC check, not just an open TCP port or a worker-ready claim. */
export async function checkTemporalHealth(): Promise<void> {
  const connection = await Connection.connect({
    ...temporalConnectionOptions(),
    connectTimeout: "2 seconds"
  });
  try {
    await connection.withDeadline(Date.now() + 2000, () =>
      connection.workflowService.getSystemInfo({})
    );
  } finally {
    await connection.close();
  }
}
