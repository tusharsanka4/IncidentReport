import { database } from "../../../shared/src/database.js";

import {
  redactSensitiveData
} from "../../../shared/src/redaction.js";
import { createToolError } from "./tool-response.js";

interface ToolResult {
  isError?: boolean;
  content: Array<{
    type: string;
    text: string;
  }>;
}

interface AuditedToolOptions<T extends ToolResult> {
  toolName: string;
  incidentId?: string;
  input: unknown;
  handler: () => Promise<T>;
}

async function recordToolAudit(
  toolName: string,
  incidentId: string | null,
  input: unknown,
  output: unknown,
  status: "SUCCESS" | "FAILED"
): Promise<void> {
  await database.query(
    `
      INSERT INTO audit_events (
        incident_id,
        actor_type,
        actor_name,
        action,
        input,
        output,
        status
      )
      VALUES (
        CASE WHEN EXISTS (SELECT 1 FROM incidents WHERE id = $1) THEN $1 ELSE NULL END,
        $2, $3, $4, $5, $6, $7
      )
    `,
    [
      incidentId,
      "MCP_TOOL",
      toolName,
      "TOOL_EXECUTED",
      redactSensitiveData(input),
      redactSensitiveData(output),
      status
    ]
  );
}

export async function runAuditedTool<
  T extends ToolResult
>(
  options: AuditedToolOptions<T>
): Promise<T | ReturnType<typeof createToolError>> {
  let result: T | ReturnType<typeof createToolError>;
  try {
    result = await options.handler();
  } catch {
    // Exception details can contain credentials. Keep the caller/audit safe.
    result = createToolError("TOOL_EXECUTION_FAILED", "The MCP operation failed");
  }
  const status =
    result.isError === true ? "FAILED" : "SUCCESS";

  try {
    await recordToolAudit(
      options.toolName,
      options.incidentId ?? null,
      options.input,
      result,
      status
    );
  } catch {
    console.error(`Audit write failed for MCP tool ${options.toolName}`);
    return createToolError(
      "AUDIT_WRITE_FAILED",
      "The operation may have completed, but its audit could not be recorded. Retry using the same workflow ID."
    );
  }

  return result;
}
