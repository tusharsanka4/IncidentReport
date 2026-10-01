import type {
  IncidentAgentState,
  IncidentAgentUpdate
} from "../agent-state.js";

import {
  invokeMcpTool
} from "../helpers/mcp-client.js";

import {
  getErrorMessage
} from "../helpers/tool-data.js";

export async function recordAnalysisNode(
  state: IncidentAgentState
): Promise<IncidentAgentUpdate> {
  if (!state.analysis) {
    return {
      status: "FAILED",
      error:
        "No analysis result is available to record"
    };
  }

  try {
    await invokeMcpTool(
      "record_analysis_result",
      {
        incident_id:
          state.incidentId,

        probable_change_id:
          state.analysis
            .probable_change_id,

        confidence_score:
          state.analysis
            .confidence_score,

        reasoning_summary:
          state.analysis
            .reasoning_summary,

        evidence:
          state.analysis.evidence,

        recommended_action:
          state.analysis
            .recommended_action,

        analysis_status:
          state.analysis
            .analysis_status
      }
    );

    return {
      status:
        state.analysis.analysis_status ===
        "MANUAL_INVESTIGATION"
          ? "MANUAL_INVESTIGATION"
          : "AWAITING_APPROVAL",

      error: null
    };
  } catch (error: unknown) {
    return {
      status: "FAILED",

      error:
        `Unable to record analysis: ${
          getErrorMessage(error)
        }`
    };
  }
}