import { Connection } from "@temporalio/client";

/** A bounded gRPC check, not just an open TCP port or a worker-ready claim. */
export async function checkTemporalHealth(): Promise<void> {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
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
