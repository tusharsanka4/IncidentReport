import "dotenv/config";

import { mcpProcessArguments } from "./mcp-process.js";

import {
  MultiServerMCPClient
} from "@langchain/mcp-adapters";

const environment = Object.fromEntries(
  Object.entries(process.env).filter(
    (
      entry
    ): entry is [string, string] =>
      entry[1] !== undefined
  )
);

const mcpClient = new MultiServerMCPClient({
  manifest: {
    transport: "stdio",

    command: process.execPath,

    args: mcpProcessArguments(),

    env: environment
  }
});

let loadedTools:
  Awaited<
    ReturnType<typeof mcpClient.getTools>
  > | null = null;

export async function closeMcpClient(): Promise<void> {
  await mcpClient.close();
  loadedTools = null;
}

async function getTools() {
  if (!loadedTools) {
    loadedTools = await mcpClient.getTools();
  }

  return loadedTools;
}

function parseToolResult(
  result: unknown
): unknown {
  if (typeof result === "string") {
    return JSON.parse(result);
  }

  if (
    result !== null &&
    typeof result === "object" &&
    "content" in result
  ) {
    const content = result.content;

    if (typeof content === "string") {
      return JSON.parse(content);
    }

    if (Array.isArray(content)) {
      const textContent = content.find(
        (item): item is {
          type: "text";
          text: string;
        } =>
          item !== null &&
          typeof item === "object" &&
          "type" in item &&
          item.type === "text" &&
          "text" in item &&
          typeof item.text === "string"
      );

      if (textContent) {
        return JSON.parse(textContent.text);
      }
    }
  }

  return result;
}

export async function invokeMcpTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const tools = await getTools();

  const tool = tools.find(
    candidate => candidate.name === toolName
  );

  if (!tool) {
    throw new Error(
      `MCP tool "${toolName}" is not available`
    );
  }

  const result = await tool.invoke(input);

  return parseToolResult(result);
}
