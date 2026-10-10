import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout } from "node:timers/promises";

import { TestWorkflowEnvironment } from "@temporalio/testing";
import {
  bundleWorkflowCode,
  DefaultLogger,
  Runtime,
  Worker
} from "@temporalio/worker";

import type { FastifyInstance } from "fastify";
import type { WorkflowHandle } from "@temporalio/client";
import type {
  IncidentWorkflow,
  WorkflowStatus
} from "../../services/temporal-worker/src/shared.types.js";

import {
  createTemporalDatabase,
  sampleAction
} from "../helpers/temporal-database.js";

async function waitForStatus(
  app: FastifyInstance,
  incidentId: string,
  expected: WorkflowStatus
): Promise<void> {
  const deadline = Date.now() + 20000;

  while (Date.now() < deadline) {
    const response = await app.inject({
      method: "GET",
      url: `/api/incidents/${incidentId}/workflow`
    });

    if (response.statusCode === 200 && response.json().data.status === expected) {
      return;
    }

    await setTimeout(25);
  }

  throw new Error(`Incident ${incidentId} did not reach ${expected}`);
}

test("Human approval HTTP API", { timeout: 120000 }, async context => {
  Runtime.install({ logger: new DefaultLogger("ERROR") });

  const fixture = await createTemporalDatabase();
  let environment: TestWorkflowEnvironment | undefined;
  let app: FastifyInstance | undefined;

  try {
    environment = await TestWorkflowEnvironment.createLocal();
    process.env.TEMPORAL_ADDRESS = environment.address;
    process.env.TEMPORAL_NAMESPACE = "default";
    process.env.TEMPORAL_TASK_QUEUE = "approval-api-test";

    const { buildApplication } = await import(
      "../../services/api/src/app.js"
    );

    app = buildApplication();
    await app.ready();

    await context.test("invalid decision bodies return 400 with request IDs", async () => {
      for (const payload of [
        {},
        { approved_by: " " },
        { approved_by: 123 },
        { approved_by: "evaluator", extra: "unexpected" },
        { approved_by: "evaluator", comment: "x".repeat(2001) }
      ]) {
        const response = await app!.inject({
          method: "POST",
          url: "/api/incidents/INC-MISSING/approve",
          headers: { "x-request-id": "req-validation" },
          payload
        });

        assert.equal(response.statusCode, 400);
        assert.equal(response.json().error.request_id, "req-validation");
      }

      const invalidSimulation = await app!.inject({
        method: "POST",
        url: "/api/incidents/INC-MISSING/analyse",
        payload: { simulation: "REAL_EXECUTION" }
      });

      assert.equal(invalidSimulation.statusCode, 400);

      const invalidJson = await app!.inject({
        method: "POST",
        url: "/api/incidents/INC-MISSING/approve",
        headers: { "content-type": "application/json" },
        payload: "{invalid"
      });

      assert.equal(invalidJson.statusCode, 400);
    });

    await context.test("missing incidents and workflows return structured 404 errors", async () => {
      const missing = await app!.inject({
        method: "POST",
        url: "/api/incidents/INC-MISSING/reject",
        payload: { rejected_by: "evaluator@example.com" }
      });

      assert.equal(missing.statusCode, 404);
      assert.equal(missing.json().error.code, "INCIDENT_NOT_FOUND");

      await fixture.createIncident("INC-NO-WORKFLOW");

      const noWorkflow = await app!.inject({
        method: "POST",
        url: "/api/incidents/INC-NO-WORKFLOW/approve",
        payload: { approved_by: "evaluator@example.com" }
      });

      assert.equal(noWorkflow.statusCode, 404);
      assert.equal(noWorkflow.json().error.code, "WORKFLOW_NOT_FOUND");

      const noAnalysis = await app!.inject({
        method: "GET",
        url: "/api/incidents/INC-NO-WORKFLOW/analysis"
      });

      assert.equal(noAnalysis.statusCode, 404);
      assert.equal(noAnalysis.json().error.code, "ANALYSIS_NOT_FOUND");
    });

    const activities = await import(
      "../../services/temporal-worker/src/activities/index.js"
    );

    const { recordAnalysisResultTool } = await import(
      "../../services/mcp-server/src/tools/record-analysis-result.tool.js"
    );

    const { findWorkflowAnalysis } = await import(
      "../../services/temporal-worker/src/repositories/analysis.repository.js"
    );

    let releaseAnalysis!: () => void;
    const slowAnalysis = new Promise<void>(resolveAnalysis => {
      releaseAnalysis = resolveAnalysis;
    });

    const worker = await Worker.create({
      connection: environment.nativeConnection,
      taskQueue: "approval-api-test",
      workflowBundle: await bundleWorkflowCode({
        workflowsPath: require.resolve(
          "../../services/temporal-worker/src/workflows/index"
        )
      }),
      maxConcurrentActivityTaskExecutions: 1,
      activities: {
        ...activities,
        async analyseIncidentActivity(incidentId: string, workflowId: string) {
          if (incidentId === "INC-HTTP-SLOW") {
            await slowAnalysis;
          }

          await recordAnalysisResultTool({
            incident_id: incidentId,
            workflow_id: workflowId,
            probable_change_id: "CHG-201",
            confidence_score: 0.87,
            reasoning_summary: "Known deployment caused the incident.",
            evidence: [{ type: "DIRECT_RESOURCE_MATCH", description: "Same service." }],
            recommended_action: sampleAction,
            analysis_status: "AWAITING_APPROVAL"
          });

          const analysis = await findWorkflowAnalysis(incidentId, workflowId);
          assert.ok(analysis);

          return analysis;
        }
      }
    });

    await worker.runUntil(async () => {
      await context.test("concurrent conflicting decisions record only one winner", async () => {
        const incidentId = "INC-HTTP-CONCURRENT";
        await fixture.createIncident(incidentId);
        await app!.inject({ method: "POST", url: `/api/incidents/${incidentId}/analyse` });
        await waitForStatus(app!, incidentId, "AWAITING_APPROVAL");

        const responses = await Promise.all([
          app!.inject({
            method: "POST", url: `/api/incidents/${incidentId}/approve`,
            payload: { approved_by: "approver@example.com" }
          }),
          app!.inject({
            method: "POST", url: `/api/incidents/${incidentId}/reject`,
            payload: { rejected_by: "reviewer@example.com" }
          })
        ]);

        assert.deepEqual(responses.map(response => response.statusCode).sort(), [202, 409]);

        const result = await environment!.client.workflow
          .getHandle<IncidentWorkflow>(`incident-remediation-${incidentId}`).result();

        assert.equal(result.status, responses[0]!.statusCode === 202 ? "RESOLVED" : "REJECTED");

        const audit = await app!.inject({
          method: "GET", url: `/api/incidents/${incidentId}/audit-log`
        });

        assert.equal(audit.json().data.events.filter(
          (event: { action: string }) => [
            "REMEDIATION_APPROVED", "REMEDIATION_REJECTED"
          ].includes(event.action)
        ).length, 1);
      });

      await context.test("a failed signal can be retried without replacing the decision", async () => {
        const incidentId = "INC-HTTP-RETRY";
        await fixture.createIncident(incidentId);
        await app!.inject({ method: "POST", url: `/api/incidents/${incidentId}/analyse` });
        await waitForStatus(app!, incidentId, "AWAITING_APPROVAL");

        const handle = environment!.client.workflow.getHandle<IncidentWorkflow>(
          `incident-remediation-${incidentId}`
        );

        const unavailableHandle = {
          describe: () => handle.describe(),
          query: () => handle.query("workflowSnapshot"),
          signal: async () => { throw new Error("Signal delivery unavailable"); }
        } as unknown as WorkflowHandle<IncidentWorkflow>;

        const { submitApprovalDecision } = await import(
          "../../services/temporal-worker/src/client/submit-decision.js"
        );

        await assert.rejects(
          submitApprovalDecision(unavailableHandle, "APPROVED", "evaluator@example.com"),
          /Signal delivery unavailable/
        );

        const recorded = await fixture.query(
          "SELECT responded_at FROM approval_requests WHERE incident_id = $1", [incidentId]
        );

        const conflict = await app!.inject({
          method: "POST", url: `/api/incidents/${incidentId}/reject`,
          payload: { rejected_by: "evaluator@example.com" }
        });
        assert.equal(conflict.statusCode, 409);

        const retry = await app!.inject({
          method: "POST", url: `/api/incidents/${incidentId}/approve`,
          payload: { approved_by: "evaluator@example.com" }
        });
        assert.equal(retry.statusCode, 202);

        const result = await handle.result();
        assert.equal(result.status, "RESOLVED");
        assert.equal(result.approval?.decidedAt, new Date(
          (recorded.rows[0] as { responded_at: string }).responded_at
        ).toISOString());
      });

      await context.test("approval before a recommendation returns 409", async () => {
        await fixture.createIncident("INC-HTTP-SLOW");

        await app!.inject({ method: "POST", url: "/api/incidents/INC-HTTP-SLOW/analyse" });

        const early = await app!.inject({
          method: "POST",
          url: "/api/incidents/INC-HTTP-SLOW/approve",
          payload: { approved_by: "evaluator@example.com" }
        });

        assert.equal(early.statusCode, 409);
        assert.equal(early.json().error.code, "APPROVAL_NOT_PENDING");

        releaseAnalysis();
        await waitForStatus(app!, "INC-HTTP-SLOW", "AWAITING_APPROVAL");

        await app!.inject({
          method: "POST",
          url: "/api/incidents/INC-HTTP-SLOW/reject",
          payload: { rejected_by: "evaluator@example.com" }
        });

        await waitForStatus(app!, "INC-HTTP-SLOW", "REJECTED");
      });

      for (const scenario of [
        { id: "INC-HTTP-APPROVE", rejected: false, simulation: "SUCCESS", status: "RESOLVED" },
        { id: "INC-HTTP-REJECT", rejected: true, simulation: "SUCCESS", status: "REJECTED" },
        { id: "INC-HTTP-UNHEALTHY", rejected: false, simulation: "UNHEALTHY", status: "ESCALATED" }
      ] as const) {
        await context.test(`${scenario.id}: HTTP lifecycle reaches ${scenario.status}`, async () => {
          const incidentId = scenario.id;

          const created = await app!.inject({
            method: "POST",
            url: "/api/incidents",
            payload: {
              incident_id: incidentId,
              service: "order-service",
              environment: "production",
              symptom: "Order failures increased",
              detected_at: "2026-08-04T08:15:00Z"
            }
          });

          assert.equal(created.statusCode, 201);

          const started = await app!.inject({
            method: "POST",
            url: `/api/incidents/${incidentId}/analyse`,
            ...(scenario.simulation === "UNHEALTHY"
              ? { payload: { simulation: "UNHEALTHY" } }
              : {})
          });

          assert.equal(started.statusCode, 202);

          const repeatedStart = await app!.inject({
            method: "POST",
            url: `/api/incidents/${incidentId}/analyse`
          });

          assert.equal(repeatedStart.statusCode, 200);
          await waitForStatus(app!, incidentId, "AWAITING_APPROVAL");

          const analysis = await app!.inject({
            method: "GET", url: `/api/incidents/${incidentId}/analysis`
          });

          assert.equal(analysis.statusCode, 200);
          assert.equal(analysis.json().data.confidence_score, 0.87);
          assert.equal(analysis.json().data.recommended_action.requires_approval, true);

          const endpoint = scenario.rejected ? "reject" : "approve";
          const payload = scenario.rejected
            ? { rejected_by: "evaluator@example.com", comment: "Reviewed evidence" }
            : { approved_by: "evaluator@example.com", comment: "Reviewed evidence" };

          const decision = await app!.inject({
            method: "POST", url: `/api/incidents/${incidentId}/${endpoint}`, payload
          });

          assert.equal(decision.statusCode, 202);

          const duplicate = await app!.inject({
            method: "POST", url: `/api/incidents/${incidentId}/${endpoint}`, payload
          });

          assert.ok([200, 202].includes(duplicate.statusCode));

          const conflict = await app!.inject({
            method: "POST",
            url: `/api/incidents/${incidentId}/${scenario.rejected ? "approve" : "reject"}`,
            payload: scenario.rejected
              ? { approved_by: "evaluator@example.com" }
              : { rejected_by: "evaluator@example.com" }
          });

          assert.equal(conflict.statusCode, 409);
          assert.equal(conflict.json().error.code, "APPROVAL_CONFLICT");

          const handle = environment!.client.workflow.getHandle<IncidentWorkflow>(
            `incident-remediation-${incidentId}`
          );

          const result = await handle.result();
          assert.equal(result.status, scenario.status);

          const repeatedDecision = await app!.inject({
            method: "POST", url: `/api/incidents/${incidentId}/${endpoint}`, payload
          });

          assert.equal(repeatedDecision.statusCode, 200);
          assert.equal(repeatedDecision.json().data.status, "ALREADY_RECORDED");

          const audit = await app!.inject({
            method: "GET", url: `/api/incidents/${incidentId}/audit-log`
          });

          assert.equal(audit.statusCode, 200);
          assert.equal(audit.json().data.events.filter(
            (event: { action: string }) => event.action ===
              `REMEDIATION_${scenario.rejected ? "REJECTED" : "APPROVED"}`
          ).length, 1);

          const attempts = await fixture.query(
            "SELECT COUNT(*) AS count FROM remediation_attempts WHERE incident_id = $1",
            [incidentId]
          );

          assert.equal((attempts.rows[0] as { count: number }).count, scenario.rejected ? 0 : 1);
        });
      }
    });

    await context.test("completed results remain readable after worker shutdown", async () => {
      const response = await app!.inject({
        method: "GET", url: "/api/incidents/INC-HTTP-APPROVE/workflow"
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.json().data.status, "RESOLVED");
    });

    await context.test("audit pagination validates parameters and preserves ordering", async () => {
      const first = await app!.inject({
        method: "GET", url: "/api/incidents/INC-HTTP-APPROVE/audit-log?limit=1"
      });
      const second = await app!.inject({
        method: "GET", url: "/api/incidents/INC-HTTP-APPROVE/audit-log?limit=1&offset=1"
      });
      assert.equal(first.json().data.events.length, 1);
      assert.equal(second.json().data.events.length, 1);
      assert.notEqual(first.json().data.events[0].id, second.json().data.events[0].id);

      const invalid = await app!.inject({
        method: "GET", url: "/api/incidents/INC-HTTP-APPROVE/audit-log?limit=invalid"
      });
      assert.equal(invalid.statusCode, 400);
    });

    await context.test("an unavailable Temporal service returns 503 with a request ID", async () => {
      const address = process.env.TEMPORAL_ADDRESS;
      const unavailableApp = buildApplication();

      try {
        process.env.TEMPORAL_ADDRESS = "127.0.0.1:1";
        const response = await unavailableApp.inject({
          method: "POST", url: "/api/incidents/INC-NO-WORKFLOW/analyse",
          headers: { "x-request-id": "req-unavailable" }
        });

        assert.equal(response.statusCode, 503);
        assert.equal(response.json().error.code, "TEMPORAL_UNAVAILABLE");
        assert.equal(response.json().error.request_id, "req-unavailable");
      } finally {
        process.env.TEMPORAL_ADDRESS = address;
        await unavailableApp.close();
      }
    });
  } finally {
    await app?.close();
    await environment?.teardown();
    await fixture.close();
  }
});
