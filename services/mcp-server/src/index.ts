import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  StdioServerTransport
} from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { database } from "../../shared/src/database.js";

import {
  runAuditedTool
} from "./helpers/audit.js";

import {
  getIncidentTool
} from "./tools/get-incident.tool.js";

import {
  getRecentChangesTool
} from "./tools/get-recent-changes.tool.js";

import {
  getResourceDependenciesTool
} from "./tools/get-resource-dependencies.tool.js";

import {
  getRankedCandidatesTool
} from "./tools/get-ranked-candidates.tool.js";

import {
  recordAnalysisResultTool
} from "./tools/record-analysis-result.tool.js";

const server = new McpServer({
  name: "manifest-incident-operations",
  version: "1.0.0"
});

/*
 * Tool 1: Get Incident
 */

server.registerTool(
  "get_incident",
  {
    title: "Get Incident",
    description:
      "Retrieves one incident using its incident ID.",
    inputSchema: {
      incident_id: z
        .string()
        .min(1)
        .describe("The incident ID, such as INC-1042")
    }
  },
  async ({ incident_id }) => {
    const input = {
      incident_id
    };

    return runAuditedTool({
      toolName: "get_incident",
      incidentId: incident_id,
      input,
      handler: () => getIncidentTool(input)
    });
  }
);

/*
 * Tool 2: Get Recent Changes
 */

server.registerTool(
  "get_recent_changes",
  {
    title: "Get Recent Changes",
    description:
      "Retrieves changes made before an incident within a specified lookback window.",
    inputSchema: {
      incident_id: z
        .string()
        .min(1)
        .describe("The incident ID"),

      lookback_hours: z
        .number()
        .int()
        .min(1)
        .max(24)
        .default(6)
        .describe(
          "How many hours before the incident to search"
        )
    }
  },
  async ({
    incident_id,
    lookback_hours
  }) => {
    const input = {
      incident_id,
      lookback_hours
    };

    return runAuditedTool({
      toolName: "get_recent_changes",
      incidentId: incident_id,
      input,
      handler: () =>
        getRecentChangesTool(input)
    });
  }
);

/*
 * Tool 3: Get Resource Dependencies
 */

server.registerTool(
  "get_resource_dependencies",
  {
    title: "Get Resource Dependencies",
    description:
      "Finds direct and indirect dependencies of a resource.",
    inputSchema: {
      resource_id: z
        .string()
        .min(1)
        .describe("The resource ID"),

      max_depth: z
        .number()
        .int()
        .min(1)
        .max(5)
        .default(3)
        .describe("Maximum dependency depth")
    }
  },
  async ({
    resource_id,
    max_depth
  }) => {
    const input = {
      resource_id,
      max_depth
    };

    return runAuditedTool({
      toolName: "get_resource_dependencies",
      input,
      handler: () =>
        getResourceDependenciesTool(input)
    });
  }
);

/*
 * Tool 4: Get Ranked Candidate Changes
 */

server.registerTool(
  "get_ranked_candidate_changes",
  {
    title: "Get Ranked Candidate Changes",
    description:
      "Retrieves and deterministically ranks recent changes for an incident.",
    inputSchema: {
      incident_id: z
        .string()
        .min(1),

      lookback_hours: z
        .number()
        .int()
        .min(1)
        .max(24)
        .default(6)
    }
  },
  async ({
    incident_id,
    lookback_hours
  }) => {
    const input = {
      incident_id,
      lookback_hours
    };

    return runAuditedTool({
      toolName: "get_ranked_candidate_changes",
      incidentId: incident_id,
      input,
      handler: () =>
        getRankedCandidatesTool(input)
    });
  }
);

/*
 * Tool 5: Record Analysis Result
 */

server.registerTool(
  "record_analysis_result",
  {
    title: "Record Analysis Result",
    description:
      "Stores an evidence-based incident analysis and recommendation.",
    inputSchema: {
      incident_id: z
        .string()
        .min(1),

      probable_change_id: z
        .string()
        .min(1)
        .nullable(),

      confidence_score: z
        .number()
        .min(0)
        .max(1),

      reasoning_summary: z
        .string()
        .min(1)
        .max(2000),

      evidence: z.array(
        z.object({
          type: z.string().min(1),
          description: z.string().min(1),
          score: z.number().optional()
        })
      ),

      recommended_action: z.object({
        type: z.string().min(1),
        resource: z.string().min(1),
        from_version: z.string().optional(),
        to_version: z.string().optional(),
        execution: z.string().min(1),
        requires_approval: z.boolean()
      }),

      analysis_status: z
        .string()
        .min(1)
    }
  },
  async (input) => {
    return runAuditedTool({
      toolName: "record_analysis_result",
      incidentId: input.incident_id,
      input,
      handler: () =>
        recordAnalysisResultTool(input)
    });
  }
);

/*
 * Start and stop the MCP server
 */

async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error("Manifest MCP server started");
}

async function shutdown(
  signal: string
): Promise<void> {
  console.error(
    `Manifest MCP server received ${signal}; shutting down`
  );

  await server.close();
  await database.end();

  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

startServer().catch((error: unknown) => {
  console.error(
    "MCP server failed to start:",
    error
  );

  process.exit(1);
});