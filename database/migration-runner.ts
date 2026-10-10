import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface MigrationClient {
  query(
    sql: string,
    values?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[] }>;
}

// Databases created by the previous Docker SQL mount have no migration ledger.
// Adopt migration 001 only when all of its expected columns already exist.
const initialColumns: Record<string, string[]> = {
  resources: ["id", "name", "resource_type", "environment", "metadata", "created_at"],
  resource_relationships: ["id", "source_resource_id", "target_resource_id", "relationship_type", "created_at"],
  incidents: ["id", "service", "environment", "symptom", "detected_at", "status", "created_at", "updated_at"],
  changes: ["id", "resource_id", "change_type", "description", "version", "environment", "deployed_at", "source", "metadata", "created_at"],
  analysis_results: ["id", "incident_id", "probable_change_id", "confidence_score", "reasoning_summary", "evidence", "recommended_action", "analysis_status", "created_at"],
  approval_requests: ["id", "incident_id", "analysis_id", "requested_action", "status", "requested_at", "responded_at", "responded_by", "comment"],
  audit_events: ["id", "incident_id", "workflow_id", "actor_type", "actor_name", "action", "input", "output", "status", "timestamp"]
};

async function hasInitialSchema(client: MigrationClient): Promise<boolean> {
  const result = await client.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public'
  `);

  const columns = new Set(result.rows.map(row => `${row.table_name}.${row.column_name}`));
  const tables = new Set(result.rows.map(row => String(row.table_name)));

  if (!Object.keys(initialColumns).some(table => tables.has(table))) {
    return false;
  }

  for (const [table, required] of Object.entries(initialColumns)) {
    for (const column of required) {
      if (!columns.has(`${table}.${column}`)) {
        throw new Error(`Existing database is incomplete: missing ${table}.${column}`);
      }
    }
  }

  return true;
}

export async function runMigrations(
  client: MigrationClient,
  directory = resolve("database/migrations")
): Promise<string[]> {
  const filenames = (await readdir(directory))
    .filter(filename => /^\d{3}_[a-z0-9_]+\.sql$/.test(filename))
    .sort();

  const applied: string[] = [];
  await client.query("BEGIN");

  try {
    // One transaction and lock protect the ledger and schema from concurrent runs.
    await client.query("SELECT pg_advisory_xact_lock(1042001)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const ledger = await client.query("SELECT filename, checksum FROM schema_migrations");
    const recorded = new Map(ledger.rows.map(row => [String(row.filename), String(row.checksum)]));

    for (const filename of recorded.keys()) {
      if (!filenames.includes(filename)) {
        throw new Error(`Applied migration ${filename} is missing from the repository`);
      }
    }

    for (const filename of filenames) {
      const sql = await readFile(resolve(directory, filename), "utf-8");
      // Stable across Windows CRLF and Linux LF checkouts.
      const checksum = createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
      const previous = recorded.get(filename);

      if (previous) {
        if (previous !== checksum) {
          throw new Error(`Applied migration ${filename} has changed; add a new migration instead`);
        }
        continue;
      }

      const adoptInitial = filename === "001_initial_schema.sql" && await hasInitialSchema(client);

      if (!adoptInitial) {
        await client.query(sql);
      }

      await client.query(
        "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
        [filename, checksum]
      );
      applied.push(filename);
    }

    await client.query("COMMIT");
    return applied;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
