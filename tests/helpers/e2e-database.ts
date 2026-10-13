import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";

import pg from "pg";
import { runMigrations } from "../../database/migration-runner.js";

const execute = promisify(execFile);

export async function createE2eDatabase() {
  const name = `manifest-e2e-${process.pid}-${Date.now()}`;
  let pool: pg.Pool | undefined;
  let created = false;

  async function close(): Promise<void> {
    await pool?.end();
    if (!created) return;

    const label = await execute("docker", [
      "inspect", "--format", '{{index .Config.Labels "manifest.test"}}', name
    ]);
    if (label.stdout.trim() !== "end-to-end") {
      throw new Error(`Refusing to remove container ${name}: test label does not match`);
    }
    // The generated, label-verified test container uses tmpfs, not user volumes.
    await execute("docker", ["rm", "--force", name]);
  }

  try {
    await execute("docker", [
      "run", "--detach", "--name", name, "--label", "manifest.test=end-to-end",
      "--publish", "127.0.0.1::5432",
      "--tmpfs", "/var/lib/postgresql/data",
      "--env", "POSTGRES_USER=manifest_e2e",
      "--env", "POSTGRES_PASSWORD=local_test_only",
      "--env", "POSTGRES_DB=manifest_e2e",
      "postgres:17-alpine"
    ]);
    created = true;

    const port = await execute("docker", ["port", name, "5432/tcp"]);
    const match = /^127\.0\.0\.1:(\d+)\s*$/.exec(port.stdout);
    if (!match) throw new Error("Could not determine the test PostgreSQL port");

    const address = `postgresql://manifest_e2e:local_test_only@127.0.0.1:${match[1]}/manifest_e2e`;
    pool = new pg.Pool({ connectionString: address, connectionTimeoutMillis: 1000 });
    const deadline = Date.now() + 30000;

    while (true) {
      try {
        await pool.query("SELECT 1");
        break;
      } catch (error) {
        if (Date.now() >= deadline) throw error;
        await setTimeout(250);
      }
    }

    const client = await pool.connect();
    try {
      await runMigrations(client);
    } finally {
      client.release();
    }

    await execute(process.execPath, [
      "node_modules/tsx/dist/cli.mjs", "database/seeds/seed.ts"
    ], { env: { ...process.env, DATABASE_URL: address } });

    return { address, pool, close };
  } catch (error) {
    await close();
    throw error;
  }
}
