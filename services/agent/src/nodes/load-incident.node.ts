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

export async function loadIncidentNode(
  state: IncidentAgentState
): Promise<IncidentAgentUpdate> {
  try {
    const response = await invokeMcpTool(
      "get_incident",
      {
        incident_id: state.incidentId
      }
    );

    const incident =
      unwrapToolData(response);

    if (!isRecord(incident)) {
      throw new Error(
        "The MCP server returned an invalid incident"
      );
    }

    return {
      incident,
      status: "INCIDENT_LOADED",
      error: null
    };
  } catch (error: unknown) {
    return {
      status: "FAILED",
      error:
        `Unable to load incident: ${
          getErrorMessage(error)
        }`
    };
  }
}