import type {
  IncidentAgentState,
  IncidentAgentUpdate
} from "../agent-state.js";

import {
  invokeMcpTool
} from "../helpers/mcp-client.js";

import {
  getErrorMessage,
  isRecord,
  unwrapToolData
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
    const response = await invokeMcpTool(
      "record_analysis_result",
      {
        incident_id:
          state.incidentId,

        workflow_id: state.workflowId,

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

    const recorded = unwrapToolData(response);

    if (
      !isRecord(recorded) ||
      recorded.analysis_id === undefined ||
      "error" in recorded
    ) {
      throw new Error("The MCP tool did not confirm analysis persistence");
    }

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
