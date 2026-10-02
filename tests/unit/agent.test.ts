import assert from "node:assert/strict";
import test from "node:test";

import {
  AnalysisOutputSchema
} from "../../services/agent/src/analysis-output.js";

import type {
  IncidentAgentState
} from "../../services/agent/src/agent-state.js";

import {
  manualInvestigationNode
} from "../../services/agent/src/nodes/manual-investigation.node.js";

import {
  routeAfterAnalysis,
  routeAfterCandidates,
  routeAfterIncident
} from "../../services/agent/src/routing.js";

function createState(
  overrides: Partial<IncidentAgentState> = {}
): IncidentAgentState {
  return {
    incidentId: "INC-TEST",

    incident: {
      incident_id: "INC-TEST",
      service: "order-service",
      environment: "production"
    },

    candidates: [
      {
        change: {
          id: "CHG-TEST",
          resource_id: "order-service"
        },

        normalized_score: 1
      }
    ],

    analysis: null,
    status: "STARTED",
    error: null,
    retryCount: 0,
    maxRetries: 2,

    ...overrides
  };
}

const validAnalysis = {
  probable_change_id: "CHG-TEST",

  confidence_score: 0.85,

  reasoning_summary:
    "A production deployment directly preceded the incident.",

  evidence: [
    {
      type: "DIRECT_RESOURCE_MATCH",

      description:
        "The change modified the affected service.",

      score: 40
    }
  ],

  recommended_action: {
    type: "ROLLBACK" as const,

    resource: "order-service",

    from_version: "v2",

    to_version: "v1",

    execution:
      "HUMAN_APPROVAL_REQUIRED" as const,

    requires_approval: true
  },

  analysis_status:
    "AWAITING_APPROVAL" as const
};

test(
  "analysis schema accepts a valid result",
  () => {
    const result =
      AnalysisOutputSchema.safeParse(
        validAnalysis
      );

    assert.equal(result.success, true);
  }
);

test(
  "analysis schema rejects confidence above one",
  () => {
    const result =
      AnalysisOutputSchema.safeParse({
        ...validAnalysis,
        confidence_score: 1.5
      });

    assert.equal(result.success, false);
  }
);

test(
  "missing incident ends the workflow",
  () => {
    const state = createState({
      incident: null,
      status: "FAILED"
    });

    assert.equal(
      routeAfterIncident(state),
      "__end__"
    );
  }
);

test(
  "valid incident continues to candidate loading",
  () => {
    const state = createState({
      status: "INCIDENT_LOADED"
    });

    assert.equal(
      routeAfterIncident(state),
      "loadCandidates"
    );
  }
);

test(
  "no candidates routes to manual investigation",
  () => {
    const state = createState({
      candidates: [],
      status: "CANDIDATES_LOADED"
    });

    assert.equal(
      routeAfterCandidates(state),
      "manualInvestigation"
    );
  }
);

test(
  "available candidates route to analysis",
  () => {
    const state = createState({
      status: "CANDIDATES_LOADED"
    });

    assert.equal(
      routeAfterCandidates(state),
      "analyseIncident"
    );
  }
);

test(
  "retry status routes back to Gemini",
  () => {
    const state = createState({
      status: "RETRYING",
      retryCount: 1
    });

    assert.equal(
      routeAfterAnalysis(state),
      "analyseIncident"
    );
  }
);

test(
  "low confidence routes to manual investigation",
  () => {
    const state = createState({
      status: "ANALYSIS_COMPLETE",

      analysis: {
        ...validAnalysis,
        confidence_score: 0.4
      }
    });

    assert.equal(
      routeAfterAnalysis(state),
      "manualInvestigation"
    );
  }
);

test(
  "strong supported analysis is recorded",
  () => {
    const state = createState({
      status: "ANALYSIS_COMPLETE",
      analysis: validAnalysis
    });

    assert.equal(
      routeAfterAnalysis(state),
      "recordAnalysis"
    );
  }
);

test(
  "manual fallback requires human approval",
  async () => {
    const state = createState({
      candidates: [],
      error: "No candidates were found"
    });

    const update =
      await manualInvestigationNode(state);

    assert.equal(
      update.status,
      "MANUAL_INVESTIGATION"
    );

    assert.equal(
      update.analysis
        ?.recommended_action
        .requires_approval,
      true
    );

    assert.equal(
      update.analysis
        ?.recommended_action
        .execution,
      "HUMAN_APPROVAL_REQUIRED"
    );
  }
);