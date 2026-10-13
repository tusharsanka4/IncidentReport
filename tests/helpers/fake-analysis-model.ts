import assert from "node:assert/strict";

import {
  AnalysisOutputSchema,
  type AnalysisOutput
} from "../../services/agent/src/analysis-output.js";
import type { RankedCandidate } from "../../services/shared/src/ranking.types.js";

interface AnalysisPrompt {
  incident: { incident_id: string; service: string };
  ranked_candidates: RankedCandidate[];
}

export class FakeAnalysisModel {
  readonly prompts = new Map<string, AnalysisPrompt>();
  readonly lowConfidenceIncidents = new Set<string>();

  async invoke(input: unknown): Promise<AnalysisOutput> {
    assert.ok(Array.isArray(input));
    const message = input.find(item => item.role === "user");
    assert.equal(typeof message?.content, "string");
    const prompt: AnalysisPrompt = JSON.parse(message.content);
    assert.equal(typeof prompt.incident.incident_id, "string");
    this.prompts.set(prompt.incident.incident_id, prompt);

    // Select from the real MCP ranking, not from a hard-coded change ID.
    const candidate = prompt.ranked_candidates[0];
    assert.ok(candidate);
    assert.equal(candidate.change.resource_id, prompt.incident.service);
    assert.equal(candidate.change.change_type, "deployment");
    assert.equal(typeof candidate.change.metadata.previous_version, "string");

    return AnalysisOutputSchema.parse({
      probable_change_id: candidate.change.id,
      confidence_score: this.lowConfidenceIncidents.has(prompt.incident.incident_id) ? 0.3 : 0.87,
      reasoning_summary: "The highest-ranked deployment directly changed the affected service.",
      evidence: candidate.evidence,
      recommended_action: {
        type: "ROLLBACK",
        resource: candidate.change.resource_id,
        from_version: candidate.change.version,
        to_version: candidate.change.metadata.previous_version,
        execution: "HUMAN_APPROVAL_REQUIRED",
        requires_approval: true
      },
      analysis_status: "AWAITING_APPROVAL"
    });
  }
}
