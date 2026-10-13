import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { setTimeout } from "node:timers/promises";

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { bundleWorkflowCode, DefaultLogger, Runtime, Worker } from "@temporalio/worker";
import type { FastifyInstance } from "fastify";

import type { RankedCandidate } from "../../services/shared/src/ranking.types.js";
import type { WorkflowStatus, WorkflowTimelineEvent } from "../../services/temporal-worker/src/shared.types.js";
import { createE2eDatabase } from "../helpers/e2e-database.js";
import { FakeAnalysisModel } from "../helpers/fake-analysis-model.js";

interface WorkflowView {
  status: WorkflowStatus;
  timeline: WorkflowTimelineEvent[];
}

interface AuditEvent {
  action: string;
  actor_type: string;
  actor_name: string;
  status: string;
  timestamp: string;
}

interface PersistedAnalysis {
  probable_change_id: string | null;
  confidence_score: number;
  analysis_status: string;
  recommended_action: { type: string; requires_approval: boolean };
}

async function closeResources(closers: Array<() => Promise<unknown>>): Promise<void> {
  const errors: unknown[] = [];
  for (const close of closers) {
    try {
      await close();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) throw new AggregateError(errors, "End-to-end cleanup failed");
}

test("Full HTTP → Temporal → LangGraph → MCP → PostgreSQL lifecycle", { timeout: 180000 }, async context => {
  Runtime.install({ logger: new DefaultLogger("ERROR") });
  const fixture = await createE2eDatabase();
  let environment: TestWorkflowEnvironment | undefined;
  let app: FastifyInstance | undefined;
  let closeMcp: (() => Promise<void>) | undefined;
  let closePool: (() => Promise<void>) | undefined;

  const originalEnvironment = { ...process.env };
  try {
    // Set these before importing application modules or creating the MCP client.
    process.env.DATABASE_URL = fixture.address;
    process.env.GOOGLE_API_KEY = "fake-model-no-network-calls";
    environment = await TestWorkflowEnvironment.createLocal();
    process.env.TEMPORAL_ADDRESS = environment.address;
    process.env.TEMPORAL_NAMESPACE = "default";
    process.env.TEMPORAL_TASK_QUEUE = "full-chain-e2e";

    const { database } = await import("../../services/shared/src/database.js");
    closePool = () => database.end();
    const mcp = await import("../../services/agent/src/helpers/mcp-client.js");
    closeMcp = mcp.closeMcpClient;
    const { analysisModel } = await import("../../services/agent/src/model.js");
    const fake = new FakeAnalysisModel();
    mock.method(analysisModel, "invoke", (input: unknown) => fake.invoke(input));

    const { buildApplication } = await import("../../services/api/src/app.js");
    app = buildApplication();
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    async function request<T>(method: string, path: string, payload?: unknown) {
      const response = await fetch(`${address}${path}`, {
        method,
        signal: AbortSignal.timeout(15000),
        headers: payload === undefined ? {} : { "content-type": "application/json" },
        body: payload === undefined ? undefined : JSON.stringify(payload)
      });
      const body = await response.json() as {
        data: T;
        error?: { code: string };
        status?: string;
      };
      return { status: response.status, body };
    }

    async function waitForStatus(id: string, expected: WorkflowStatus): Promise<WorkflowView> {
      const deadline = Date.now() + 45000;
      let last: unknown;
      while (Date.now() < deadline) {
        const result = await request<WorkflowView>("GET", `/api/incidents/${id}/workflow`);
        last = result;
        if (result.status === 200 && result.body.data.status === expected) {
          return result.body.data;
        }
        await setTimeout(100);
      }
      throw new Error(`${id} did not reach ${expected}: ${JSON.stringify(last)}`);
    }

    assert.equal((await request("GET", "/health")).body.status, "healthy");
    assert.equal((await request("GET", "/ready")).body.status, "ready");

    // Every activity is the production implementation, including analysis.
    const activities = await import("../../services/temporal-worker/src/activities/index.js");
    const worker = await Worker.create({
      connection: environment.nativeConnection,
      taskQueue: "full-chain-e2e",
      workflowBundle: await bundleWorkflowCode({
        workflowsPath: require.resolve("../../services/temporal-worker/src/workflows/index")
      }),
      activities
    });

    await worker.runUntil(async () => {
      for (const scenario of [
        { name: "approval", decision: "approve", simulation: "SUCCESS", final: "RESOLVED" },
        { name: "rejection", decision: "reject", simulation: "SUCCESS", final: "REJECTED" },
        { name: "low-confidence", decision: null, simulation: "SUCCESS", final: "ESCALATED" },
        { name: "no-candidates", decision: null, simulation: "SUCCESS", final: "ESCALATED" },
        { name: "remediation-failure", decision: "approve", simulation: "REMEDIATION_FAILURE", final: "ESCALATED" },
        { name: "unhealthy", decision: "approve", simulation: "UNHEALTHY", final: "ESCALATED" }
      ] as const) {
        await context.test(scenario.name, async () => {
          const id = `INC-E2E-${scenario.name}`;
          if (scenario.name === "low-confidence") fake.lowConfidenceIncidents.add(id);

          const created = await request("POST", "/api/incidents", {
            incident_id: id, service: "order-service", environment: "production",
            symptom: "Order failures increased",
            detected_at: scenario.name === "no-candidates"
              ? "2026-08-01T08:15:00Z" : "2026-08-04T08:15:00Z"
          });
          assert.equal(created.status, 201);

          const path = `/api/incidents/${id}`;
          assert.equal((await request("POST", `${path}/analyse`, {
            simulation: scenario.simulation
          })).status, 202);
          assert.equal((await request("POST", `${path}/analyse`)).status, 200);

          if (scenario.decision) {
            await waitForStatus(id, "AWAITING_APPROVAL");
            const before = await fixture.pool.query(
              "SELECT COUNT(*)::int AS count FROM remediation_attempts WHERE incident_id = $1", [id]
            );
            assert.equal(before.rows[0].count, 0, "Remediation must wait for human approval");

            const decision = scenario.decision === "approve"
              ? { approved_by: "evaluator@example.com", comment: "Reviewed real MCP evidence" }
              : { rejected_by: "evaluator@example.com", comment: "Manual review needed" };
            assert.equal((await request("POST", `${path}/${scenario.decision}`, decision)).status, 202);
            await waitForStatus(id, scenario.final);
            assert.equal((await request("POST", `${path}/${scenario.decision}`, decision)).status, 200);
            const conflict = await request("POST", `${path}/${scenario.decision === "approve" ? "reject" : "approve"}`,
              scenario.decision === "approve" ? { rejected_by: "other" } : { approved_by: "other" });
            assert.equal(conflict.status, 409);
          }

          const final = await waitForStatus(id, scenario.final);
          const analysis = await request<PersistedAnalysis>("GET", `${path}/analysis`);
          assert.equal(analysis.status, 200);
          assert.equal(analysis.body.data.recommended_action.requires_approval, true);
          assert.equal(analysis.body.data.analysis_status,
            scenario.decision ? "AWAITING_APPROVAL" : "MANUAL_INVESTIGATION");
          assert.equal(analysis.body.data.confidence_score,
            scenario.name === "no-candidates" ? 0 : scenario.name === "low-confidence" ? 0.3 : 0.87);
          if (!scenario.decision) {
            assert.equal(analysis.body.data.recommended_action.type, "MANUAL_INVESTIGATION");
          }

          const candidates = await request<{ candidates: RankedCandidate[] }>("GET", `${path}/candidates`);
          assert.equal(candidates.status, 200);
          if (scenario.name === "no-candidates") {
            assert.equal(candidates.body.data.candidates.length, 0);
            assert.equal(fake.prompts.has(id), false, "No evidence must bypass the model");
            assert.equal(analysis.body.data.probable_change_id, null);
          } else {
            assert.equal(candidates.body.data.candidates[0]!.change.id, "CHG-201");
            assert.deepEqual(fake.prompts.get(id)?.ranked_candidates, candidates.body.data.candidates);
            assert.equal(analysis.body.data.probable_change_id, "CHG-201");
          }

          const incident = await request<{ status: string }>("GET", path);
          assert.equal(incident.body.data.status, scenario.final);
          const attempts = await fixture.pool.query(
            "SELECT health_result FROM remediation_attempts WHERE incident_id = $1", [id]
          );
          assert.equal(attempts.rowCount, scenario.decision === "approve" ? 1 : 0);
          if (scenario.name === "remediation-failure") assert.equal(attempts.rows[0].health_result, null);
          if (scenario.name === "unhealthy") assert.equal(attempts.rows[0].health_result.healthy, false);
          if (scenario.name === "approval") assert.equal(attempts.rows[0].health_result.healthy, true);

          const audit = await request<{ events: AuditEvent[] }>("GET", `${path}/audit-log`);
          assert.equal(audit.status, 200);
          const events = audit.body.data.events;
          for (const tool of ["get_incident", "get_ranked_candidate_changes", "record_analysis_result"]) {
            assert.equal(events.filter(event => event.actor_type === "MCP_TOOL" &&
              event.actor_name === tool && event.status === "SUCCESS").length, 1);
          }
          assert.deepEqual(events.filter(event => event.action === "WORKFLOW_STATUS_CHANGED")
            .map(event => event.status), final.timeline.map(event => event.status));
          assert.deepEqual(events.map(event => event.timestamp), events.map(event => event.timestamp).sort());
          assert.equal(events.filter(event => event.action === "REMEDIATION_APPROVED" ||
            event.action === "REMEDIATION_REJECTED").length, scenario.decision ? 1 : 0);
          const counts = await fixture.pool.query(
            "SELECT COUNT(*)::int AS count FROM analysis_results WHERE incident_id = $1", [id]
          );
          assert.equal(counts.rows[0].count, 1);
        });
      }
    });
  } finally {
    try {
      await closeResources([
        async () => app?.close(),
        async () => closeMcp?.(),
        async () => closePool?.(),
        async () => environment?.teardown(),
        () => fixture.close()
      ]);
    } finally {
      mock.restoreAll();
      for (const key of ["DATABASE_URL", "GOOGLE_API_KEY", "TEMPORAL_ADDRESS", "TEMPORAL_NAMESPACE", "TEMPORAL_TASK_QUEUE"]) {
        if (originalEnvironment[key] === undefined) delete process.env[key];
        else process.env[key] = originalEnvironment[key];
      }
    }
  }
});
