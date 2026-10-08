import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { mock } from "node:test";

import { PGlite } from "@electric-sql/pglite";

import type { PoolClient } from "pg";

import type {
  RecommendedAction
} from "../../services/temporal-worker/src/shared.types.js";

export const sampleAction: RecommendedAction = {
  type: "ROLLBACK",
  resource: "order-service",
  from_version: "v2.4.1",
  to_version: "v2.4.0",
  execution: "HUMAN_APPROVAL_REQUIRED",
  requires_approval: true
};

export async function createTemporalDatabase() {
  // The test adapter runs SQL in embedded PostgreSQL; no real pool is connected.
  process.env.DATABASE_URL = "postgresql://test:test@localhost:1/test";

  const { database } = await import(
    "../../services/shared/src/database.js"
  );

  const embedded = new PGlite();

  async function query(sql: string, values?: unknown[]) {
    const result = await embedded.query(sql, values);

    return {
      rows: result.rows,
      rowCount: result.affectedRows || result.rows.length,
      fields: [],
      command: ""
    };
  }

  const client = {
    query,
    release() {}
  } as unknown as PoolClient;

  const connectMock = mock.method(database, "connect", async () => client);
  const queryMock = mock.method(database, "query", query);

  const initialSql = await readFile(
    resolve("database/migrations/001_initial_schema.sql"),
    "utf-8"
  );

  const lifecycleSql = await readFile(
    resolve("database/migrations/002_temporal_lifecycle.sql"),
    "utf-8"
  );

  await embedded.exec(initialSql);
  await embedded.exec(lifecycleSql);
  await embedded.exec(lifecycleSql);

  await query(`
    INSERT INTO resources (id, name, resource_type, environment)
    VALUES ('order-service', 'order-service', 'SERVICE', 'production');
  `);

  await query(`
    INSERT INTO changes (id, resource_id, change_type, version, environment, deployed_at, metadata)
    VALUES (
      'CHG-201', 'order-service', 'deployment', 'v2.4.1', 'production', NOW(),
      '{"previous_version":"v2.4.0"}'::jsonb
    );
  `);

  return {
    query,

    async createIncident(incidentId: string): Promise<void> {
      await query(
        `
          INSERT INTO incidents (id, service, environment, symptom, detected_at)
          VALUES ($1, 'order-service', 'production', 'Order failures', NOW())
        `,
        [incidentId]
      );
    },

    async close(): Promise<void> {
      connectMock.mock.restore();
      queryMock.mock.restore();
      await database.end();
      await embedded.close();
    }
  };
}
