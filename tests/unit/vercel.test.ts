import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import Fastify from "fastify";

import { protectDemo } from "../../services/api/src/demo-access.js";
import { temporalConnectionOptions } from "../../services/shared/src/temporal-connection.js";

const username = "evaluator";
const password = "private-demo-password-for-tests";
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

test("hosted demo fails closed and protects every method before route execution", async () => {
  for (const environment of [
    { VERCEL: "1" },
    { VERCEL: "1", DEMO_USERNAME: username, DEMO_PASSWORD: "short" },
    { VERCEL: "1", DEMO_USERNAME: username, DEMO_PASSWORD: password }
  ]) {
    const app = Fastify();
    protectDemo(app, environment);
    let calls = 0;
    app.all("/private", async () => { calls++; return { ok: true }; });
    try {
      const configured = environment.DEMO_PASSWORD === password;
      for (const method of ["GET", "POST", "DELETE"] as const) {
        const response = await app.inject({ method, url: "/private" });
        assert.equal(response.statusCode, configured ? 401 : 503);
        assert.equal(response.headers["cache-control"], "no-store");
        assert.doesNotMatch(response.body, /private-demo-password/);
      }
      assert.equal(calls, 0);
      for (const invalid of ["Bearer token", "Basic !!!", "Basic d3Jvbmc6d3Jvbmc="]) {
        assert.equal((await app.inject({ url: "/private", headers: { authorization: invalid } })).statusCode,
          configured ? 401 : 503);
      }
      const response = await app.inject({ url: "/private", headers: { authorization } });
      assert.equal(response.statusCode, configured ? 200 : 503);
      assert.equal(calls, configured ? 1 : 0);
    } finally {
      await app.close();
    }
  }
});

test("local API remains accessible without demo credentials", async () => {
  const app = Fastify();
  protectDemo(app, {});
  app.get("/health", async () => ({ status: "healthy" }));
  try {
    assert.equal((await app.inject("/health")).statusCode, 200);
  } finally { await app.close(); }
});

test("Temporal configuration keeps local defaults and requires TLS for hosted credentials", () => {
  assert.deepEqual(temporalConnectionOptions({}), {
    address: "localhost:7233", tls: false, apiKey: undefined
  });
  const remote = { TEMPORAL_ADDRESS: "namespace.example:7233", TEMPORAL_TLS: "true", TEMPORAL_API_KEY: "test-key" };
  assert.deepEqual(temporalConnectionOptions(remote), {
    address: remote.TEMPORAL_ADDRESS, tls: true, apiKey: "test-key"
  });
  assert.throws(() => temporalConnectionOptions({ TEMPORAL_API_KEY: "test-key" }), /requires/);
  assert.throws(() => temporalConnectionOptions({ VERCEL: "1" }), /requires/);
  assert.throws(() => temporalConnectionOptions({ TEMPORAL_TLS: "yes" }), /true or false/);
});

test("Vercel handler serves authenticated assets and preserves API paths over HTTP", async () => {
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
  process.env.VERCEL = "1";
  process.env.DEMO_USERNAME = username;
  process.env.DEMO_PASSWORD = password;
  const { default: handler } = require("../../api/index.js") as typeof import("../../api/index.js");
  const server = createServer((request, response) => {
    void handler(request, response).catch(() => { response.statusCode = 500; response.end(); });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(`${origin}/`)).status, 401);
    const headers = { authorization };
    const responses = await Promise.all(["/", "/demo/app.mjs", "/health"].map(path => fetch(`${origin}${path}`, { headers })));
    for (const response of responses) assert.equal(response.status, 200);
    assert.match(await responses[0]!.text(), /IncidentReport/);
    const invalid = await fetch(`${origin}/api/incidents/INC-1050/analyse`, {
      method: "POST", headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ incident_id: "unexpected" })
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json() as { error: { code: string } }).error.code, "VALIDATION_ERROR");
    assert.equal((await fetch(`${origin}/unknown`, { headers })).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    delete process.env.VERCEL;
    delete process.env.DEMO_USERNAME;
    delete process.env.DEMO_PASSWORD;
  }
});
