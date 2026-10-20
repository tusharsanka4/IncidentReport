import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execute = promisify(execFile);
const entrypoint = path.resolve(__dirname, "../../deploy/container-entrypoint.cjs");
const fixture = path.resolve(__dirname, "../fixtures/container-environment.cjs");

test("container entrypoint encodes database credentials and forwards arguments", async () => {
  const result = await execute(process.execPath, [entrypoint, fixture, "example"], {
    env: { POSTGRES_USER: "demo@user", POSTGRES_PASSWORD: "pass:/?#%", POSTGRES_DB: "demo db" }
  });
  const output = JSON.parse(result.stdout);
  const address = new URL(output.databaseUrl);
  assert.equal(address.hostname, "postgres");
  assert.equal(address.port, "5432");
  assert.equal(decodeURIComponent(address.username), "demo@user");
  assert.equal(decodeURIComponent(address.password), "pass:/?#%");
  assert.equal(decodeURIComponent(address.pathname), "/demo db");
  assert.deepEqual(output.args, ["example"]);
});

test("container entrypoint preserves an explicitly supplied database URL", async () => {
  const databaseUrl = "postgresql://demo:fake@external-db:5432/example";
  const result = await execute(process.execPath, [entrypoint, fixture], { env: { DATABASE_URL: databaseUrl } });
  assert.equal(JSON.parse(result.stdout).databaseUrl, databaseUrl);
});

test("container entrypoint rejects missing configuration without exposing credentials", async () => {
  await assert.rejects(execute(process.execPath, [entrypoint, fixture], { env: { POSTGRES_PASSWORD: "private-test-value" } }),
    (error: Error & { stderr?: string }) => {
      assert.match(error.stderr ?? "", /Set CONTAINER_DATABASE_URL/);
      assert.doesNotMatch(error.stderr ?? "", /private-test-value/);
      return true;
    });
});
