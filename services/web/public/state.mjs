export const terminalStatuses = new Set(["RESOLVED", "REJECTED", "ESCALATED", "FAILED", "CANCELED", "CANCELLED", "TERMINATED", "TIMED_OUT"]);

export function statusOf(state) {
  return state.workflow?.status ?? state.incident?.status ?? "RECEIVED";
}

export function canApprove(state) {
  return Boolean(state.workflow?.status === "AWAITING_APPROVAL" &&
    state.workflow.approval_request && !state.workflow.approval && !state.busy && !state.offline);
}

export function canAnalyse(state) {
  return Boolean(state.incident && !state.workflow && state.incident.status === "RECEIVED" && !state.busy && !state.offline);
}

export function successfulTool(state, name) {
  return state.audit.find(event => event.actor_type === "MCP_TOOL" &&
    event.actor_name === name && event.status === "SUCCESS");
}

export function toolData(event) {
  if (!event) return null;
  try {
    const output = typeof event.output === "string" ? JSON.parse(event.output) : event.output;
    const text = output?.content?.find(item => item.type === "text")?.text;
    return text ? JSON.parse(text) : output;
  } catch {
    return null;
  }
}

export function stages(state) {
  const status = statusOf(state);
  const manual = state.analysis?.analysis_status === "MANUAL_INVESTIGATION";
  const analysing = status === "ANALYSING";
  const done = terminalStatuses.has(status);
  return [
    { label: "Incident", state: state.incident ? "done" : "pending" },
    { label: "Evidence", state: state.candidates ? "done" : analysing ? "active" : "pending" },
    { label: "LangGraph", state: state.analysis ? "done" : analysing ? "active" : "pending" },
    { label: "Review", state: state.analysis ? "done" : "pending" },
    { label: "Approval", state: manual ? "skipped" : state.workflow?.approval ? "done" : status === "AWAITING_APPROVAL" ? "active" : "pending" },
    { label: "Outcome", state: done ? "done" : ["APPROVED", "REMEDIATING", "VERIFYING_HEALTH"].includes(status) ? "active" : "pending" }
  ];
}
