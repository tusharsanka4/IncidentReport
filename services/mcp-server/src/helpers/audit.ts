import { database } from "../../../shared/src/database.js";

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
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      incidentId,
      "MCP_TOOL",
      toolName,
      "TOOL_EXECUTED",
      input,
      output,
      status
    ]
  );
}

export async function runAuditedTool<
  T extends ToolResult
>(
  options: AuditedToolOptions<T>
): Promise<T> {
  const result = await options.handler();
  const status =
    result.isError === true ? "FAILED" : "SUCCESS";

  try {
    await recordToolAudit(
      options.toolName,
      status === "SUCCESS"
        ? options.incidentId ?? null
        : null,
      options.input,
      result,
      status
    );
  } catch (error) {
    console.error(
      `Could not audit ${options.toolName}:`,
      error
    );
  }

  return result;
}