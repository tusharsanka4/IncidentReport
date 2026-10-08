import type { PoolClient } from "pg";

import {
  database
} from "../../../shared/src/database.js";

export async function withTransaction<T>(
  handler: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await database.connect();

  try {
    await client.query("BEGIN");

    const result = await handler(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}
