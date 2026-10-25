import assert from "node:assert/strict";
import test, { mock } from "node:test";
import Fastify from "fastify";

import { createWorkerHealthServer } from "../../services/temporal-worker/src/health.js";
import { redactSensitiveData } from "../../services/shared/src/redaction.js";

test("API liveness stays healthy while database/Temporal readiness fails and recovers", async () => {
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
  const { healthRoutes } = await import("../../services/api/src/routes/health.routes.js");
  let database = true;
  let temporal = true;
  const app = Fastify();
  app.register(healthRoutes, {
    checkDatabase: async () => { if (!database) throw new Error("private database details"); },
    checkTemporal: async () => { if (!temporal) throw new Error("private Temporal details"); }
  });
  try {
    assert.equal((await app.inject("/ready/workflow")).statusCode, 200);
    temporal = false;
    assert.equal((await app.inject("/ready/workflow")).statusCode, 503);
    assert.equal((await app.inject("/ready")).statusCode, 200);
    database = false;
    assert.equal((await app.inject("/ready")).statusCode, 503);
    assert.equal((await app.inject("/health")).statusCode, 200);
    assert.doesNotMatch((await app.inject("/ready/workflow")).body, /private/);
    temporal = database = true;
    assert.equal((await app.inject("/ready/workflow")).statusCode, 200);
  } finally { await app.close(); }
});

test("worker HTTP readiness follows SDK polling, dependency outages, and recovery", async () => {
  let running = true;
  let dependencies = true;
  const server = createWorkerHealthServer({
    status: () => ({ runState: running ? "RUNNING" : "STOPPED", workflowPollerState: "POLLING", activityPollerState: "POLLING" }),
    checkDatabase: async () => { if (!dependencies) throw new Error("database down"); },
    checkTemporal: async () => { if (!dependencies) throw new Error("Temporal down"); }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(`${url}/ready`)).status, 200);
    dependencies = false;
    assert.equal((await fetch(`${url}/ready`)).status, 503);
    assert.equal((await fetch(`${url}/health`)).status, 200);
    dependencies = true; running = false;
    assert.equal((await fetch(`${url}/ready`)).status, 503);
    running = true;
    assert.equal((await fetch(`${url}/ready`)).status, 200);
    assert.equal((await fetch(`${url}/unknown`)).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("redaction protects nested JSON and credentials inside free-form messages", () => {
  const value = { token: "private", payload: JSON.stringify({ api_key: "private" }),
    message: "postgresql://user:private@host/db Bearer private token=private" };
  const redacted = JSON.stringify(redactSensitiveData(value));
  assert.doesNotMatch(redacted, /private/);
  assert.match(redacted, /REDACTED/);
});

test("idle database socket errors do not crash the process or log credentials", async () => {
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
  const { database } = await import("../../services/shared/src/database.js");
  const log = mock.method(console, "error", () => {});
  try {
    assert.doesNotThrow(() => database.emit("error", new Error("password=private")));
    assert.doesNotMatch(JSON.stringify(log.mock.calls), /private/);
    assert.equal(log.mock.calls.length, 1);
  } finally { log.mock.restore(); }
});
