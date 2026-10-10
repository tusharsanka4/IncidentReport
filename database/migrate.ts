import "dotenv/config";

import { database } from "../services/shared/src/database.js";
import { runMigrations } from "./migration-runner.js";

async function migrateDatabase(): Promise<void> {
  try {
    const client = await database.connect();

    try {
      const applied = await runMigrations(client);
      console.log(applied.length
        ? `Database migrations applied: ${applied.join(", ")}`
        : "Database migrations are already up to date.");
    } finally {
      client.release();
    }
  } finally {
    await database.end();
  }
}

migrateDatabase().catch((error: unknown) => {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
});
