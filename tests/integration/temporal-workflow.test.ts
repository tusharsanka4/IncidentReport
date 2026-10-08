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

import type { WorkflowHandle } from "@temporalio/client";

import type {
  AnalysisActivityResult,
  IncidentWorkflow,
  IncidentWorkflowSnapshot,
  SimulationScenario,
  WorkflowStatus
} from "../../services/temporal-worker/src/shared.types.js";

import {
  createTemporalDatabase,
  sampleAction
} from "../helpers/temporal-database.js";

import {
  submitApprovalDecision
} from "../../services/temporal-worker/src/client/submit-decision.js";

async function waitForStatus(
  handle: WorkflowHandle<IncidentWorkflow>,
  status: WorkflowStatus
): Promise<IncidentWorkflowSnapshot> {
  const deadline = Date.now() + 20000;

  while (Date.now() < deadline) {
    const snapshot = await handle.query<IncidentWorkflowSnapshot>(
      "workflowSnapshot"
    );

    if (snapshot.status === status) {
      return snapshot;
    }

    await setTimeout(25);
  }

  throw new Error(`Workflow did not reach ${status}`);
}

test("Temporal incident lifecycle", { timeout: 180000 }, async context => {
  Runtime.install({ logger: new DefaultLogger("ERROR") });

  const fixture = await createTemporalDatabase();

  let environment: TestWorkflowEnvironment | undefined;

  try {
    environment = await TestWorkflowEnvironment.createLocal();

    const workflowBundle = await bundleWorkflowCode({
      workflowsPath: require.resolve(
        "../../services/temporal-worker/src/workflows/index"
      )
    });

    const activities = await import(
      "../../services/temporal-worker/src/activities/index.js"
    );

    const { findWorkflowAnalysis } = await import(
      "../../services/temporal-worker/src/repositories/analysis.repository.js"
    );

    const { recordAnalysisResultTool } = await import(
      "../../services/mcp-server/src/tools/record-analysis-result.tool.js"
    );

    const cases: Array<{
      name: string;
      simulation?: SimulationScenario;
      rejected?: boolean;
      manual?: boolean;
      retryAnalysis?: boolean;
      analysisFailure?: boolean;
      retryRemediation?: boolean;
      invalidSignals?: boolean;
      duplicate?: boolean;
      restart?: boolean;
      expected: WorkflowStatus;
    }> = [
      { name: "approval resolves after health verification", expected: "RESOLVED" },
      { name: "rejection never executes remediation", rejected: true, expected: "REJECTED" },
      { name: "failed remediation escalates", simulation: "REMEDIATION_FAILURE", expected: "ESCALATED" },
      { name: "unhealthy verification escalates", simulation: "UNHEALTHY", expected: "ESCALATED" },
      { name: "manual investigation escalates without approval", manual: true, expected: "ESCALATED" },
      { name: "analysis activity retries transient failures", retryAnalysis: true, expected: "RESOLVED" },
      { name: "exhausted analysis retries persist FAILED", analysisFailure: true, expected: "FAILED" },
      { name: "remediation activity retries safely", retryRemediation: true, expected: "RESOLVED" },
      { name: "invalid and mismatched signals cannot approve", invalidSignals: true, expected: "RESOLVED" },
      { name: "duplicate decisions do not duplicate execution", duplicate: true, expected: "RESOLVED" },
      { name: "approval wait survives worker restart", restart: true, expected: "RESOLVED" }
    ];

    for (const [index, scenario] of cases.entries()) {
      await context.test(scenario.name, async () => {
        const incidentId = `INC-TEMPORAL-${index}`;
        const workflowId = `incident-remediation-${incidentId}`;
        const taskQueue = `temporal-test-${index}`;

        await fixture.createIncident(incidentId);

        let analysisAttempts = 0;
        let remediationCalls = 0;

        const testActivities = {
          ...activities,

          async analyseIncidentActivity(): Promise<AnalysisActivityResult> {
            analysisAttempts += 1;

            if (
              scenario.analysisFailure ||
              (scenario.retryAnalysis && analysisAttempts === 1)
            ) {
              throw new Error("Controlled temporary analysis failure");
            }

            await recordAnalysisResultTool({
              incident_id: incidentId,
              workflow_id: workflowId,
              probable_change_id: scenario.manual ? null : "CHG-201",
              confidence_score: scenario.manual ? 0 : 0.87,
              reasoning_summary: "Deterministic test analysis.",
              evidence: [{ type: "TEST_EVIDENCE", description: "Known deployment." }],
              recommended_action: scenario.manual
                ? { ...sampleAction, type: "MANUAL_INVESTIGATION" }
                : sampleAction,
              analysis_status: scenario.manual
                ? "MANUAL_INVESTIGATION"
                : "AWAITING_APPROVAL"
            });

            const analysis = await findWorkflowAnalysis(incidentId, workflowId);
            assert.ok(analysis);

            return analysis;
          },

          async executeRemediationActivity(
            ...argumentsList: Parameters<typeof activities.executeRemediationActivity>
          ) {
            remediationCalls += 1;

            if (scenario.retryRemediation && remediationCalls === 1) {
              throw new Error("Controlled temporary remediation failure");
            }

            return activities.executeRemediationActivity(...argumentsList);
          }
        };

        async function createWorker() {
          return Worker.create({
            connection: environment!.nativeConnection,
            taskQueue,
            workflowBundle,
            activities: testActivities,
            // Embedded PostgreSQL uses a single session for these tests.
            maxConcurrentActivityTaskExecutions: 1
          });
        }

        let handle: WorkflowHandle<IncidentWorkflow>;

        const worker = await createWorker();

        const result = await worker.runUntil(async () => {
          handle = await environment!.client.workflow.start<IncidentWorkflow>(
            "incidentRemediationWorkflow",
            {
              workflowId,
              taskQueue,
              workflowIdReusePolicy: "REJECT_DUPLICATE",
              args: [{ incidentId, simulation: scenario.simulation }]
            }
          );

          if (scenario.manual || scenario.analysisFailure) {
            return handle.result();
          }

          const waiting = await waitForStatus(handle, "AWAITING_APPROVAL");

          assert.equal(remediationCalls, 0);
          assert.ok(waiting.approvalRequest);

          if (scenario.restart) {
            return undefined;
          }

          if (scenario.invalidSignals) {
            await handle.signal("approvalDecision", {
              decision: "APPROVED",
              approvalRequestId: waiting.approvalRequest.id,
              decidedBy: " ",
              decidedAt: new Date().toISOString()
            });

            await handle.signal("approveRemediation", {
              decision: "APPROVED",
              approvalRequestId: "wrong-request",
              decidedBy: "evaluator@example.com",
              decidedAt: new Date().toISOString()
            });

            const unchanged = await handle.query<IncidentWorkflowSnapshot>(
              "workflowSnapshot"
            );

            assert.equal(unchanged.status, "AWAITING_APPROVAL");
            assert.equal(unchanged.approval, undefined);
            assert.equal(remediationCalls, 0);
          }

          await submitApprovalDecision(
            handle,
            scenario.rejected ? "REJECTED" : "APPROVED",
            "evaluator@example.com"
          );

          if (scenario.duplicate) {
            await handle.signal("approveRemediation", {
              approvalRequestId: waiting.approvalRequest.id,
              decision: "APPROVED",
              decidedBy: "evaluator@example.com",
              decidedAt: new Date().toISOString()
            });
          }

          return handle.result();
        });

        let finalResult = result;

        if (scenario.restart) {
          const restartedWorker = await createWorker();

          finalResult = await restartedWorker.runUntil(async () => {
            await waitForStatus(handle!, "AWAITING_APPROVAL");

            await submitApprovalDecision(
              handle!, "APPROVED", "evaluator@example.com"
            );

            return handle!.result();
          });
        }

        assert.ok(finalResult);
        assert.equal(finalResult.status, scenario.expected);

        const persisted = await fixture.query(
          "SELECT status FROM incidents WHERE id = $1", [incidentId]
        );

        assert.equal(
          (persisted.rows[0] as { status: string }).status,
          scenario.expected
        );

        const attempts = await fixture.query(
          "SELECT COUNT(*) AS count FROM remediation_attempts WHERE workflow_id = $1",
          [workflowId]
        );

        assert.equal(
          (attempts.rows[0] as { count: number }).count,
          scenario.rejected || scenario.manual || scenario.analysisFailure ? 0 : 1
        );

        if (scenario.expected === "RESOLVED") {
          assert.equal(finalResult.health?.healthy, true);
        }

        if (scenario.retryAnalysis) {
          assert.equal(analysisAttempts, 2);
        }

        if (scenario.analysisFailure) {
          assert.equal(analysisAttempts, 3);
        }

        if (scenario.duplicate) {
          assert.equal(remediationCalls, 1);
          assert.equal(await submitApprovalDecision(
            handle!, "APPROVED", "evaluator@example.com"
          ), false);

          await assert.rejects(submitApprovalDecision(
            handle!, "REJECTED", "evaluator@example.com"
          ), /conflicting approval/);
        }

        if (scenario.retryRemediation) {
          assert.equal(remediationCalls, 2);
        }

        const snapshot = finalResult;

        assert.equal(snapshot.timeline.at(-1)?.status, scenario.expected);
      });
    }
  } finally {
    await environment?.teardown();
    await fixture.close();
  }
});
