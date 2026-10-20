import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";

const execute = promisify(execFile);
const address = "http://127.0.0.1:13000";
const compose = [
  "compose", "--env-file", ".env", "--project-name", "manifest-verification",
  "-f", "deploy/docker-compose.yml", "-f", "deploy/docker-compose.app.yml",
  "-f", "deploy/docker-compose.verify.yml", "-f", "deploy/docker-compose.container-test.yml"
];

interface WorkflowView {
  status: string;
  remediation?: { success: boolean };
  health?: { healthy: boolean };
  error?: string;
}

async function request<T>(method: string, path: string, payload?: unknown) {
  const response = await fetch(`${address}${path}`, {
    method, signal: AbortSignal.timeout(15000),
    headers: payload === undefined ? {} : { "content-type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  const body = await response.json() as { data: T; error?: { code: string } };
  return { status: response.status, body };
}

async function waitForStatus(id: string, expected: string): Promise<WorkflowView> {
  const deadline = Date.now() + 60000;
  let last: unknown;
  while (Date.now() < deadline) {
    let result: Awaited<ReturnType<typeof request<WorkflowView>>>;
    try {
      result = await request<WorkflowView>("GET", `/api/incidents/${id}/workflow`);
    } catch (error) {
      last = error instanceof Error ? error.message : error;
      await setTimeout(250);
      continue;
    }
    last = result;
    if (result.status === 200 && result.body.data.status === expected) return result.body.data;
    if (result.status === 200 && ["RESOLVED", "REJECTED", "ESCALATED", "FAILED"].includes(result.body.data.status)) {
      throw new Error(`Unexpected terminal status: ${JSON.stringify(result.body.data)}`);
    }
    await setTimeout(250);
  }
  throw new Error(`${id} did not reach ${expected}: ${JSON.stringify(last)}`);
}

test("Compiled containers run the complete incident lifecycle", { timeout: 180000 }, async context => {
  for (const name of ["manifest-verification-api-1", "manifest-verification-worker-1"]) {
    const label = await execute("docker", [
      "inspect", "--format", '{{index .Config.Labels "com.docker.compose.project"}}', name
    ]);
    assert.equal(label.stdout.trim(), "manifest-verification");
  }

  const runtime = await execute("docker", ["exec", "manifest-verification-worker-1", "node", "-e", `
    const fs = require('node:fs');
    let tsx = false;
    try { require.resolve('tsx'); tsx = true; } catch {}
    console.log(JSON.stringify({
      uid: process.getuid(), tsx,
      source: fs.existsSync('services/agent/src/graph.ts'),
      envFile: fs.existsSync('.env'),
      compiledMcp: fs.existsSync('dist/services/mcp-server/src/index.js')
    }));
  `]);
  assert.deepEqual(JSON.parse(runtime.stdout), {
    uid: 1000, tsx: false, source: false, envFile: false, compiledMcp: true
  });

  assert.equal((await fetch(`${address}/`)).status, 200);
  assert.equal((await fetch(`${address}/demo/app.mjs`)).status, 200);
  assert.equal((await fetch(`${address}/ready`)).status, 200);

  const prefix = `INC-CONTAINER-${Date.now()}`;
  for (const scenario of [
    { name: "approved", decision: "approve", simulation: "SUCCESS", final: "RESOLVED" },
    { name: "rejected", decision: "reject", simulation: "SUCCESS", final: "REJECTED" },
    { name: "low-confidence", decision: null, simulation: "SUCCESS", final: "ESCALATED" },
    { name: "no-candidates", decision: null, simulation: "SUCCESS", final: "ESCALATED" },
    { name: "remediation-failure", decision: "approve", simulation: "REMEDIATION_FAILURE", final: "ESCALATED" },
    { name: "unhealthy", decision: "approve", simulation: "UNHEALTHY", final: "ESCALATED" }
  ] as const) {
    await context.test(scenario.name, async () => {
      const id = `${prefix}-${scenario.name}`;
      const path = `/api/incidents/${id}`;
      const created = await request("POST", "/api/incidents", {
        incident_id: id, service: "order-service", environment: "production",
        symptom: `Order failures increased [${scenario.name}]`,
        detected_at: scenario.name === "no-candidates" ? "2026-08-01T08:15:00Z" : "2026-08-04T08:15:00Z"
      });
      assert.equal(created.status, 201);
      assert.equal((await request("POST", `${path}/analyse`, { simulation: scenario.simulation })).status, 202);
      assert.equal((await request("POST", `${path}/analyse`)).status, 200);

      if (scenario.decision) {
        await waitForStatus(id, "AWAITING_APPROVAL");

        if (scenario.name === "approved") {
          // Restart only the label-verified verification services. Temporal and
          // PostgreSQL retain their state while both app processes are replaced.
          await execute("docker", [...compose, "restart", "worker", "api"]);
          await waitForStatus(id, "AWAITING_APPROVAL");
        }

        const decision = scenario.decision === "approve"
          ? { approved_by: "container-reviewer", comment: "Reviewed MCP evidence" }
          : { rejected_by: "container-reviewer", comment: "Needs manual review" };
        assert.equal((await request("POST", `${path}/${scenario.decision}`, decision)).status, 202);
        await waitForStatus(id, scenario.final);
        assert.equal((await request("POST", `${path}/${scenario.decision}`, decision)).status, 200);
        const conflict = await request("POST", `${path}/${scenario.decision === "approve" ? "reject" : "approve"}`,
          scenario.decision === "approve" ? { rejected_by: "other" } : { approved_by: "other" });
        assert.equal(conflict.status, 409);
      }

      const final = await waitForStatus(id, scenario.final);
      if (scenario.name === "approved") assert.equal(final.health?.healthy, true);
      if (scenario.name === "unhealthy") assert.equal(final.health?.healthy, false);
      if (scenario.name === "remediation-failure") assert.equal(final.remediation?.success, false);
      if (scenario.decision !== "approve") assert.equal(final.remediation, undefined);

      const analysis = await request<{ analysis_status: string; recommended_action: { requires_approval: boolean } }>("GET", `${path}/analysis`);
      assert.equal(analysis.status, 200);
      assert.equal(analysis.body.data.recommended_action.requires_approval, true);
      assert.equal(analysis.body.data.analysis_status, scenario.decision ? "AWAITING_APPROVAL" : "MANUAL_INVESTIGATION");
      const audit = await request<{ events: Array<{ actor_type: string; actor_name: string; status: string }> }>("GET", `${path}/audit-log`);
      assert.equal(audit.status, 200);
      for (const tool of ["get_incident", "get_ranked_candidate_changes", "record_analysis_result"]) {
        assert.equal(audit.body.data.events.filter(event => event.actor_type === "MCP_TOOL" &&
          event.actor_name === tool && event.status === "SUCCESS").length, 1);
      }
      assert.equal((await request<{ status: string }>("GET", path)).body.data.status, scenario.final);
    });
  }
});
