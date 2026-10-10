import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

import { runMigrations, type MigrationClient } from "../../database/migration-runner.js";

async function createDatabase() {
  const address = process.env.TEST_DATABASE_URL;

  if (!address) {
    const embedded = new PGlite();
    return {
      client: {
        async query(sql: string, values?: unknown[]) {
          if (values === undefined) {
            const results = await embedded.exec(sql);
            return { rows: (results.at(-1)?.rows ?? []) as Record<string, unknown>[] };
          }
          const result = await embedded.query<Record<string, unknown>>(sql, values);
          return { rows: result.rows };
        }
      },
      close: () => embedded.close()
    };
  }

  const url = new URL(address);
  if (url.pathname !== "/manifest_verification") {
    throw new Error("TEST_DATABASE_URL must target the disposable manifest_verification database");
  }

  const admin = new pg.Client({ connectionString: address });
  await admin.connect();
  const name = `manifest_test_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  await admin.query(`CREATE DATABASE ${name}`);
  url.pathname = `/${name}`;
  const client = new pg.Client({ connectionString: url.toString() });

  try {
    await client.connect();
  } catch (error) {
    await admin.query(`DROP DATABASE ${name}`);
    await admin.end();
    throw error;
  }

  return {
    client,
    connectionString: url.toString(),
    async close() {
      await client.end();
      // Only the generated database on the explicitly selected test server.
      await admin.query(`DROP DATABASE ${name}`);
      await admin.end();
    }
  };
}

async function loadMigration(client: MigrationClient, filename: string) {
  await client.query(await readFile(resolve("database/migrations", filename), "utf-8"));
}

test("Database migrations support fresh installs and safe upgrades", async context => {
  await context.test("concurrent PostgreSQL migrations serialize safely", {
    skip: !process.env.TEST_DATABASE_URL
  }, async () => {
    const database = await createDatabase();
    if (!("connectionString" in database)) {
      throw new Error("This test requires PostgreSQL");
    }
    const other = new pg.Client({ connectionString: database.connectionString });
    try {
      await other.connect();
      const results = await Promise.all([
        runMigrations(database.client), runMigrations(other)
      ]);
      assert.deepEqual(results.map(result => result.length).sort(), [0, 3]);
    } finally {
      await other.end();
      await database.close();
    }
  });
  await context.test("fresh installs run once and record checksums", async () => {
    const database = await createDatabase();
    try {
      assert.equal((await runMigrations(database.client)).length, 3);
      assert.deepEqual(await runMigrations(database.client), []);
      const ledger = await database.client.query("SELECT * FROM schema_migrations");
      assert.equal(ledger.rows.length, 3);
      assert.ok(ledger.rows.every(row => String(row.checksum).length === 64));
    } finally {
      await database.close();
    }
  });

  for (const lifecycleInstalled of [false, true]) {
    await context.test(`legacy upgrade preserves incidents (002 installed: ${lifecycleInstalled})`, async () => {
      const database = await createDatabase();
      try {
        await loadMigration(database.client, "001_initial_schema.sql");
        if (lifecycleInstalled) {
          await loadMigration(database.client, "002_temporal_lifecycle.sql");
        }
        await database.client.query(`
          INSERT INTO incidents (id, service, environment, symptom, detected_at)
          VALUES ('INC-EXISTING', 'order-service', 'production', 'Order failures', NOW())
        `);
        await runMigrations(database.client);
        await database.client.query("UPDATE incidents SET status = 'VERIFYING_HEALTH' WHERE id = 'INC-EXISTING'");
        const incident = await database.client.query("SELECT status FROM incidents WHERE id = 'INC-EXISTING'");
        assert.equal(incident.rows[0]!.status, "VERIFYING_HEALTH");
        assert.deepEqual(await runMigrations(database.client), []);
      } finally {
        await database.close();
      }
    });
  }

  await context.test("changed migration checksums are rejected", async () => {
    const database = await createDatabase();
    try {
      await runMigrations(database.client);
      await database.client.query("UPDATE schema_migrations SET checksum = 'tampered' WHERE filename = '001_initial_schema.sql'");
      await assert.rejects(runMigrations(database.client), /has changed/);
    } finally {
      await database.close();
    }
  });

  await context.test("approval decisions require an actor and timestamp", async () => {
    const database = await createDatabase();
    try {
      await runMigrations(database.client);
      await database.client.query(`
        INSERT INTO incidents (id, service, environment, symptom, detected_at)
        VALUES ('INC-APPROVAL', 'order-service', 'production', 'Failure', NOW());
        INSERT INTO analysis_results (incident_id, reasoning_summary, analysis_status)
        VALUES ('INC-APPROVAL', 'Deployment evidence', 'AWAITING_APPROVAL');
      `);
      await assert.rejects(database.client.query(`
        INSERT INTO approval_requests (incident_id, analysis_id, requested_action, status)
        SELECT 'INC-APPROVAL', id, '{}'::jsonb, 'APPROVED' FROM analysis_results
      `), /complete_approval_decision/);
    } finally {
      await database.close();
    }
  });

  await context.test("partial legacy schemas are rejected without modifying them", async () => {
    const database = await createDatabase();
    try {
      await database.client.query("CREATE TABLE incidents (id TEXT PRIMARY KEY)");
      await assert.rejects(runMigrations(database.client), /incomplete/);
      const ledger = await database.client.query("SELECT to_regclass('public.schema_migrations') AS ledger");
      assert.equal(ledger.rows[0]!.ledger, null);
    } finally {
      await database.close();
    }
  });

  await context.test("a failing migration rolls back the schema and ledger together", async () => {
    const database = await createDatabase();
    try {
      const failingClient: MigrationClient = {
        async query(sql, values) {
          if (sql.includes("ADD CONSTRAINT complete_approval_decision")) {
            throw new Error("Injected migration failure");
          }
          return database.client.query(sql, values);
        }
      };
      await assert.rejects(runMigrations(failingClient), /Injected migration failure/);
      const result = await database.client.query("SELECT to_regclass('public.incidents') AS incidents");
      assert.equal(result.rows[0]!.incidents, null);
      assert.equal((await runMigrations(database.client)).length, 3);
    } finally {
      await database.close();
    }
  });
});
