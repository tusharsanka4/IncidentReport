import "dotenv/config";

import {
  Client,
  Connection
} from "@temporalio/client";

export function getIncidentWorkflowId(
  incidentId: string
): string {
  return `incident-remediation-${incidentId}`;
}

export async function withWorkflowClient<T>(
  handler: (client: Client) => Promise<T>
): Promise<T> {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233"
  });

  const client = new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE ?? "default"
  });

  try {
    return await handler(client);
  } finally {
    await connection.close();
  }
}
