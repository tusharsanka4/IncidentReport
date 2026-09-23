import "dotenv/config";


import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  StdioServerTransport
} from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { database } from "../../shared/src/database.js";
import {
  getIncidentTool
} from "./tools/get-incident.tool.js";
import {
  getRecentChangesTool
} from "./tools/get-recent-changes.tool.js";
import {
  getResourceDependenciesTool
} from "./tools/get-resource-dependencies.tool.js";

const server = new McpServer({
  name: "manifest-incident-operations",
  version: "1.0.0"
});

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
    return getIncidentTool({
      incident_id
    });
  }
);

async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error("Manifest MCP server started");
}

async function shutdown(signal: string): Promise<void> {
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
  console.error("MCP server failed to start:", error);
  process.exit(1);
});


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
        .describe("How many hours before the incident to search")
    }
  },
  async ({
    incident_id,
    lookback_hours
  }) => {
    return getRecentChangesTool({
      incident_id,
      lookback_hours
    });
  }
);


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
    return getResourceDependenciesTool({
      resource_id,
      max_depth
    });
  }
);