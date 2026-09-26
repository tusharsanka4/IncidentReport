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

export async function loadCandidatesNode(
  state: IncidentAgentState
): Promise<IncidentAgentUpdate> {
  try {
    const response = await invokeMcpTool(
      "get_ranked_candidate_changes",
      {
        incident_id: state.incidentId,
        lookback_hours: 6
      }
    );

    const result =
      unwrapToolData(response);

    if (!isRecord(result)) {
      throw new Error(
        "The MCP server returned an invalid candidate response"
      );
    }

    const candidates = result.candidates;

    if (!Array.isArray(candidates)) {
      throw new Error(
        "The candidate response does not contain a candidates array"
      );
    }

    const validCandidates =
      candidates.filter(isRecord);

    if (
      validCandidates.length !==
      candidates.length
    ) {
      throw new Error(
        "One or more candidates have an invalid structure"
      );
    }

    return {
      candidates: validCandidates,
      status: "CANDIDATES_LOADED",
      error: null
    };
  } catch (error: unknown) {
    return {
      status: "FAILED",
      error:
        `Unable to load candidates: ${
          getErrorMessage(error)
        }`
    };
  }
}