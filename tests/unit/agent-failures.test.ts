import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { createIncidentAnalysisGraph } from "../../services/agent/src/graph.js";
import { assessAttribution } from "../../services/agent/src/attribution-policy.js";
import type { AnalysisOutput } from "../../services/agent/src/analysis-output.js";

const incident = { incident_id: "INC-FAILURE", service: "order-service", environment: "production", detected_at: "2026-08-04T08:15:00Z" };
const candidate = (id = "CHG-0", score = 85, environment = "production") => ({
  change: { id, resource_id: "order-service", environment, deployed_at: "2026-08-04T08:05:00Z" },
  raw_score: score, normalized_score: score / 85, dependency_distance: 0
});
const analysis: AnalysisOutput = {
  probable_change_id: "CHG-0", confidence_score: 0.9, reasoning_summary: "Supported test deployment",
  evidence: [{ type: "DIRECT_RESOURCE_MATCH", description: "Same resource" }],
  recommended_action: { type: "ROLLBACK", resource: "order-service", from_version: "v2", to_version: "v1", execution: "HUMAN_APPROVAL_REQUIRED", requires_approval: true },
  analysis_status: "AWAITING_APPROVAL"
};

async function run(options: { toolFailure?: string; toolError?: string; invalid?: boolean; modelFails?: boolean; candidates?: Record<string, unknown>[] } = {}) {
  let calls = 0;
  const recorded: Record<string, unknown>[] = [];
  const graph = createIncidentAnalysisGraph({
    invokeTool: async (name, input) => {
      if (name === options.toolFailure) throw new Error("MCP connection unavailable");
      if (name === options.toolError) return { error: { code: "AUDIT_WRITE_FAILED", message: "Audit could not be confirmed" } };
      if (name === "get_incident") return incident;
      if (name === "get_ranked_candidate_changes") return { candidates: options.candidates ?? [candidate()] };
      if (name === "record_analysis_result") { recorded.push(input); return { analysis_id: "1" }; }
      throw new Error("Unexpected tool call");
    },
    model: { async invoke() {
      calls++;
      if (options.modelFails) throw new Error("token=private-test-value upstream unavailable");
      return options.invalid ? { ...analysis, confidence_score: 2 } : analysis;
    } }
  });
  const result = await graph.invoke({ incidentId: incident.incident_id, maxRetries: 2 });
  return { result, calls, recorded };
}

test("invalid output and retry exhaustion record manual investigation after exactly three attempts", async () => {
  for (const options of [{ invalid: true }, { modelFails: true }]) {
    const { result, calls, recorded } = await run(options);
    assert.equal(result.status, "MANUAL_INVESTIGATION");
    assert.equal(calls, 3);
    assert.equal(recorded.length, 1);
    assert.equal(recorded[0]!.analysis_status, "MANUAL_INVESTIGATION");
    assert.equal(result.analysis?.recommended_action.requires_approval, true);
    assert.doesNotMatch(JSON.stringify(result), /private-test-value/);
  }
});

test("MCP read failures and persistence failures cannot become an approval-ready success", async () => {
  for (const toolFailure of ["get_incident", "get_ranked_candidate_changes", "record_analysis_result"]) {
    const { result, calls } = await run({ toolFailure });
    assert.equal(result.status, "FAILED");
    if (toolFailure !== "record_analysis_result") assert.equal(calls, 0);
  }
  for (const toolError of ["get_incident", "get_ranked_candidate_changes", "record_analysis_result"]) {
    assert.equal((await run({ toolError })).result.status, "FAILED");
  }
});

test("labelled attribution cases abstain on ambiguity independently of model confidence", async context => {
  const cases: Array<{ name: string; scores: number[]; environments: string[]; expected: string | null }> = JSON.parse(
    readFileSync(path.resolve(__dirname, "../fixtures/attribution-cases.json"), "utf8")
  );
  let correct = 0;
  let safeAbstentions = 0;
  for (const item of cases) {
    const candidates = item.scores.map((score, index) => candidate(`CHG-${index}`, score, item.environments[index]));
    assert.equal(assessAttribution(incident, candidates).changeId, item.expected, item.name);
    const { result, calls } = await run({ candidates });
    const selected = result.analysis?.probable_change_id;
    if (item.expected) { assert.equal(result.status, "AWAITING_APPROVAL"); assert.equal(selected, item.expected); correct++; }
    else { assert.equal(result.status, "MANUAL_INVESTIGATION"); assert.equal(calls, 0); safeAbstentions++; }
  }
  assert.equal(correct, 1);
  assert.equal(safeAbstentions, 5);
  context.diagnostic(JSON.stringify({ cases: cases.length, correctAttributions: correct, appropriateManualInvestigations: safeAbstentions,
    expectedOutcomeRate: (correct + safeAbstentions) / cases.length, evaluation: "synthetic policy/graph regression, not live-model accuracy" }));
});
