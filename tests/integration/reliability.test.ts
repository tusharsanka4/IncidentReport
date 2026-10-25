import assert from "node:assert/strict";
import test, { mock } from "node:test";
import type { WorkflowHandle } from "@temporalio/client";

import { createTemporalDatabase, sampleAction } from "../helpers/temporal-database.js";
import type { ApprovalDecision, IncidentWorkflow, IncidentWorkflowSnapshot } from "../../services/temporal-worker/src/shared.types.js";

test("approval delivery recovery and MCP audit reliability", async context => {
  const fixture = await createTemporalDatabase();
  const { database } = await import("../../services/shared/src/database.js");
  const { runAuditedTool } = await import("../../services/mcp-server/src/helpers/audit.js");
  const { createToolResponse } = await import("../../services/mcp-server/src/helpers/tool-response.js");
  try {
    await context.test("MCP reverse-dependency retrieval follows indirect paths and terminates with cycles", async () => {
      await fixture.query("INSERT INTO resources (id, name, resource_type, environment) VALUES ('frontend','frontend','SERVICE','production'), ('redis','redis','CACHE','production')");
      await fixture.query("INSERT INTO resource_relationships (source_resource_id, target_resource_id, relationship_type) VALUES ('frontend','order-service','CALLS'), ('order-service','redis','DEPENDS_ON'), ('redis','frontend','DEPENDS_ON')");
      const { getResourceDependenciesTool } = await import("../../services/mcp-server/src/tools/get-resource-dependencies.tool.js");
      const result = await getResourceDependenciesTool({ resource_id: "redis", max_depth: 3, direction: "dependents" });
      const data = JSON.parse(result.content[0]!.text);
      assert.equal(data.direction, "dependents");
      assert.deepEqual(data.related_resources.map((item: { resource: string }) => item.resource), ["order-service", "frontend"]);
      assert.deepEqual(data.related_resources[1].path, ["redis", "order-service", "frontend"]);
    });
    await fixture.createIncident("INC-AUDIT");
    await context.test("analysis and its mandatory persistence audit roll back together", async () => {
      const id = "INC-AUDIT-ROLLBACK";
      await fixture.createIncident(id);
      const { recordAnalysisResultTool } = await import("../../services/mcp-server/src/tools/record-analysis-result.tool.js");
      const originalConnect = database.connect.bind(database);
      const connect = mock.method(database, "connect", async () => {
        const client = await originalConnect();
        return new Proxy(client, {
          get(target, property) {
            if (property === "query") return async (sql: string, values?: unknown[]) => {
              if (sql.includes("INSERT INTO audit_events")) throw new Error("Injected persistence audit failure");
              return target.query(sql, values);
            };
            return Reflect.get(target, property);
          }
        });
      });
      const errorLog = mock.method(console, "error", () => {});
      try {
        const result = await recordAnalysisResultTool({
          incident_id: id, workflow_id: `workflow-${id}`, probable_change_id: "CHG-201", confidence_score: 0.9,
          reasoning_summary: "Test rollback", evidence: [{ type: "TEST", description: "Synthetic evidence" }],
          recommended_action: sampleAction, analysis_status: "AWAITING_APPROVAL"
        });
        assert.ok("isError" in result && result.isError);
        const analyses = await fixture.query("SELECT id FROM analysis_results WHERE incident_id = $1", [id]);
        assert.equal(analyses.rows.length, 0);
        const incident = await fixture.query("SELECT status FROM incidents WHERE id = $1", [id]);
        assert.equal((incident.rows[0] as { status: string }).status, "RECEIVED");
      } finally { connect.mock.restore(); errorLog.mock.restore(); }
    });
    await context.test("thrown tool failures retain incident correlation without leaking credentials", async () => {
      const result = await runAuditedTool({
        toolName: "failing_tool", incidentId: "INC-AUDIT", input: { authorization: "private", nested: { api_key: "private" } },
        handler: async () => { throw new Error("postgresql://user:private@host/db"); }
      });
      assert.equal(result.isError, true);
      const audit = await fixture.query("SELECT incident_id, status, input, output FROM audit_events WHERE actor_name = 'failing_tool'");
      assert.equal(audit.rows.length, 1);
      assert.equal((audit.rows[0] as { incident_id: string }).incident_id, "INC-AUDIT");
      assert.equal((audit.rows[0] as { status: string }).status, "FAILED");
      assert.doesNotMatch(JSON.stringify(audit.rows), /private/);
    });
    await context.test("missing incidents can still produce a failed audit without foreign-key errors", async () => {
      await runAuditedTool({ toolName: "missing_tool", incidentId: "INC-MISSING", input: {}, handler: async () => ({ isError: true, ...createToolResponse({ error: "missing" }) }) });
      const audit = await fixture.query("SELECT incident_id FROM audit_events WHERE actor_name = 'missing_tool'");
      assert.equal(audit.rows.length, 1);
      assert.equal((audit.rows[0] as { incident_id: null }).incident_id, null);
    });
    await context.test("audit-write failure is surfaced instead of reporting an unaudited success", async () => {
      const failedQuery = mock.method(database, "query", async () => { throw new Error("password=private"); });
      const errorLog = mock.method(console, "error", () => {});
      try {
        const result = await runAuditedTool({ toolName: "read_tool", input: {}, handler: async () => createToolResponse({ ok: true }) });
        assert.ok("isError" in result && result.isError);
        assert.match(result.content[0]!.text, /AUDIT_WRITE_FAILED/);
        assert.doesNotMatch(JSON.stringify(errorLog.mock.calls), /password=private/);
      } finally { failedQuery.mock.restore(); errorLog.mock.restore(); }
    });
    await context.test("a saved approval survives signal failure and identical redelivery is idempotent", async () => {
      const id = "INC-DELIVERY";
      const workflowId = `incident-remediation-${id}`;
      await fixture.createIncident(id);
      const { recordAnalysisResultTool } = await import("../../services/mcp-server/src/tools/record-analysis-result.tool.js");
      await recordAnalysisResultTool({
        incident_id: id, workflow_id: workflowId, probable_change_id: "CHG-201", confidence_score: 0.87,
        reasoning_summary: "Supported deployment", evidence: [{ type: "DIRECT_RESOURCE_MATCH", description: "Same service" }],
        recommended_action: sampleAction, analysis_status: "AWAITING_APPROVAL"
      });
      const { findWorkflowAnalysis } = await import("../../services/temporal-worker/src/repositories/analysis.repository.js");
      const { createApprovalRequest } = await import("../../services/temporal-worker/src/repositories/approval.repository.js");
      const analysis = await findWorkflowAnalysis(id, workflowId);
      assert.ok(analysis);
      const request = await createApprovalRequest(id, workflowId, analysis);
      const snapshot = { incidentId: id, workflowId, status: "AWAITING_APPROVAL", approvalRequest: request, timeline: [] } as IncidentWorkflowSnapshot;
      const delivered: ApprovalDecision[] = [];
      let available = false;
      const handle = {
        describe: async () => ({ status: { name: "RUNNING" } }),
        query: async () => snapshot,
        signal: async (_name: string, decision: ApprovalDecision) => {
          delivered.push(decision);
          if (!available) throw new Error("Signal connection lost");
        }
      } as unknown as WorkflowHandle<IncidentWorkflow>;
      const { submitApprovalDecision } = await import("../../services/temporal-worker/src/client/submit-decision.js");
      await assert.rejects(submitApprovalDecision(handle, "APPROVED", "reviewer", "checked"), /Signal connection lost/);
      const stored = await fixture.query("SELECT status, responded_at FROM approval_requests WHERE workflow_id = $1", [workflowId]);
      assert.equal((stored.rows[0] as { status: string }).status, "APPROVED");
      available = true;
      assert.equal(await submitApprovalDecision(handle, "APPROVED", "reviewer", "checked"), true);
      assert.equal(delivered[1]!.decidedAt, delivered[0]!.decidedAt);
      await assert.rejects(submitApprovalDecision(handle, "REJECTED", "reviewer", "checked"));
      snapshot.approval = delivered[1];
      assert.equal(await submitApprovalDecision(handle, "APPROVED", "reviewer", "checked"), false);
      const audit = await fixture.query("SELECT id FROM audit_events WHERE event_key = $1", [`${workflowId}:approval-decision`]);
      assert.equal(audit.rows.length, 1);
      const remediations = await fixture.query("SELECT workflow_id FROM remediation_attempts WHERE workflow_id = $1", [workflowId]);
      assert.equal(remediations.rows.length, 0);
    });
  } finally { await fixture.close(); }
});
