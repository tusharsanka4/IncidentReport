import assert from "node:assert/strict";
import test from "node:test";

import { createAnalysisModel } from "../../services/agent/src/model.js";
import { analyseIncidentNode } from "../../services/agent/src/nodes/analyse-incident.node.js";
import { manualInvestigationNode } from "../../services/agent/src/nodes/manual-investigation.node.js";
import type { IncidentAgentState } from "../../services/agent/src/agent-state.js";

// This suite requires the local Postman simulation, not a real provider.
const model = createAnalysisModel({
  GROQ_API_KEY: "synthetic-http-verification-only",
  GROQ_BASE_URL: process.env.POSTMAN_SIMULATION_URL ?? "http://127.0.0.1:4900/groq"
});

test("real model HTTP adapter and analysis node handle success, invalid output, and upstream failure", { timeout: 60000 }, async context => {
  for (const marker of ["success", "model-unavailable", "invalid-output"]) {
    await context.test(marker, async () => {
      let state: IncidentAgentState = {
        incidentId: `INC-HTTP-${marker}`, workflowId: undefined,
        incident: { incident_id: `INC-HTTP-${marker}`, service: "order-service", environment: "production", detected_at: "2026-08-04T08:15:00Z", symptom: `[${marker}]` },
        candidates: [{ change: { id: "CHG-0", resource_id: "order-service", environment: "production", deployed_at: "2026-08-04T08:05:00Z", version: "v2", metadata: { previous_version: "v1" } },
          raw_score: 85, dependency_distance: 0, evidence: [{ type: "DIRECT_RESOURCE_MATCH", description: "Same service", score: 40 }] }],
        analysis: null, status: "STARTED", error: null, retryCount: 0, maxRetries: 2
      };
      for (let attempt = 0; attempt < 3; attempt++) {
        state = { ...state, ...await analyseIncidentNode(state, model) } as IncidentAgentState;
        if (state.status !== "RETRYING") break;
      }
      if (marker === "success") {
        assert.equal(state.status, "ANALYSIS_COMPLETE");
        assert.equal(state.analysis?.probable_change_id, "CHG-0");
      } else {
        assert.equal(state.status, "FAILED");
        assert.equal(state.retryCount, 3);
        const fallback = await manualInvestigationNode(state);
        assert.equal(fallback.analysis?.recommended_action.type, "MANUAL_INVESTIGATION");
      }
    });
  }
});
