import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { database } from "../services/shared/src/database.js";

async function migrateTemporal(): Promise<void> {
  const sql = await readFile(
    resolve("database/migrations/002_temporal_lifecycle.sql"),
    "utf-8"
  );

  const client = await database.connect();

  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");

    console.log("Temporal lifecycle migration applied.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await database.end();
  }
}

migrateTemporal().catch((error: unknown) => {
  console.error("Temporal migration failed:", error);
  process.exitCode = 1;
});
