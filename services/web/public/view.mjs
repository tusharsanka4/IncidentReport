import { canAnalyse, canApprove, stages, statusOf, successfulTool, terminalStatuses, toolData } from "./state.mjs";

export const element = id => document.getElementById(id);
export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const pretty = value => escapeHtml(JSON.stringify(value, null, 2));
const label = value => String(value ?? "").replaceAll("_", " ").toLowerCase();
const clock = value => value && Number.isFinite(new Date(value).getTime())
  ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
const tone = status => ["FAILED", "REJECTED", "TERMINATED", "CANCELED", "CANCELLED", "TIMED_OUT"].includes(status)
  ? "fail" : ["AWAITING_APPROVAL", "ESCALATED"].includes(status) ? "warn" : "";
const previousMarkup = new Map();

// Polling should not collapse a candidate or audit event someone is reading.
function replaceDetails(id, html) {
  if (previousMarkup.get(id) === html) return;
  previousMarkup.set(id, html);
  const target = element(id);
  const open = new Set([...target.querySelectorAll("details[open]")].map(item => item.dataset.key));
  target.innerHTML = html;
  for (const item of target.querySelectorAll("details")) item.open = open.has(item.dataset.key);
}

export function renderList(incidents, activeId) {
  const html = incidents.length ? incidents.map(incident => `
    <button class="incident-option ${incident.id === activeId ? "selected" : ""}" data-incident="${escapeHtml(incident.id)}" aria-pressed="${incident.id === activeId}">
      <strong>${escapeHtml(incident.id)}</strong><span>${escapeHtml(incident.service)} · ${escapeHtml(label(incident.status))}</span>
    </button>`).join("") : '<p class="muted small">No incidents yet. Create the first one below.</p>';
  if (previousMarkup.get("incident-list") !== html) {
    previousMarkup.set("incident-list", html);
    element("incident-list").innerHTML = html;
  }
}

export function render(state) {
  const incident = state.incident;
  element("workspace").hidden = !incident;
  element("workspace").classList.toggle("offline", state.offline);
  element("empty-state").hidden = Boolean(incident);
  element("incident-form").querySelector('button[type="submit"]').disabled = state.busy;
  if (!incident) return;

  const status = statusOf(state);
  element("incident-title").textContent = incident.id;
  element("incident-subtitle").textContent = `${incident.service} / ${incident.environment} · ${incident.symptom}`;
  element("workflow-status").textContent = label(status);
  element("workflow-status").className = `badge ${tone(status)}`;
  element("sync-status").textContent = state.offline ? "Connection interrupted · retrying" : `Updated ${clock(state.updatedAt)} · polling every 2s`;
  element("progress").innerHTML = stages(state).map((step, index) => `
    <li class="${step.state}" ${step.state === "active" ? 'aria-current="step"' : ""}><span>${step.state === "done" ? "✓" : step.state === "skipped" ? "−" : index + 1}</span>${step.label}</li>`).join("");

  renderCandidates(state);
  renderAgent(state);
  renderAnalysis(state);
  renderOutcome(state);
  renderAudit(state);

  element("analyse").disabled = !canAnalyse(state);
  element("simulation").disabled = !canAnalyse(state);
  element("analyse").textContent = state.busy ? "Working…" : state.workflow ? "Analysis started" : "Start analysis →";
  element("start-hint").textContent = state.workflow
    ? "Temporal owns this run. Reopening the incident resumes observation, not execution."
    : incident.status !== "RECEIVED"
      ? "No Temporal history was found for this incident. Use a fresh incident ID if you switched servers."
      : "Starts the real LangGraph agent via Temporal. A running worker and configured model key are required.";
  element("approve").disabled = !canApprove(state);
  element("reject").disabled = !canApprove(state);
  element("approval-hint").textContent = state.workflow?.approval
    ? `Decision recorded: ${label(state.workflow.approval.decision)} by ${state.workflow.approval.decidedBy}.`
    : canApprove(state) ? "Review the evidence first. Your decision is persisted before Temporal resumes. Identity is caller-supplied in this local demo."
      : "Approval is available only when the workflow is awaiting a human decision.";
}

function renderCandidates(state) {
  const candidates = state.candidates?.candidates ?? [];
  element("candidate-count").textContent = candidates.length;
  replaceDetails("candidates", candidates.length ? candidates.map(candidate => {
    const change = candidate.change;
    const relation = candidate.dependency_distance === 0 ? "Direct service change"
      : candidate.dependency_distance === null ? "No dependency path" : `${candidate.dependency_distance}-hop dependency`;
    return `<details class="candidate" data-key="${escapeHtml(change.id)}"><summary><div><strong>${escapeHtml(change.id)} · ${escapeHtml(change.resource_id)}</strong><p>${escapeHtml(relation)} · ${escapeHtml(change.change_type)} · ${escapeHtml(change.environment)}</p></div><span class="score">${escapeHtml(candidate.raw_score)} pts</span></summary>
      <p>${escapeHtml(change.description ?? "No description")}</p><p>Deployed ${escapeHtml(new Date(change.deployed_at).toLocaleString())}${change.version ? ` · ${escapeHtml(change.version)}` : ""}</p>
      <ul class="evidence-list">${candidate.evidence.map(item => `<li><span>${escapeHtml(item.description)}</span><b>${item.score > 0 ? "+" : ""}${escapeHtml(item.score)}</b></li>`).join("")}</ul><details data-key="metadata-${escapeHtml(change.id)}"><summary class="small muted">Change metadata</summary><pre>${pretty(change.metadata)}</pre></details></details>`;
  }).join("") : '<p class="muted small">No candidate changes in the lookback window. The agent may recommend manual investigation.</p>');
}

function renderAgent(state) {
  const running = statusOf(state) === "ANALYSING";
  element("agent-indicator").className = `activity-indicator ${running && !state.offline ? "active" : ""}`;
  element("agent-status").innerHTML = state.analysis
    ? '<p class="agent-copy">Analysis recorded. The recommendation below is based on the incident and ranked change evidence.</p>'
    : terminalStatuses.has(statusOf(state)) ? '<p class="agent-copy">This run ended without a recorded analysis.<br><span class="muted small">Check the workflow outcome and worker terminal for the cause.</span></p>'
    : running ? '<p class="agent-copy">LangGraph is analysing the incident…<br><span class="muted small">MCP events appear as tools finish. The API does not expose per-node or token-level progress.</span></p>'
      : '<p class="agent-copy">Ready to connect the dots.<br><span class="muted small">Start analysis to send the incident and its ranked candidates through the agent.</span></p>';
  element("agent-events").innerHTML = [
    ["get_incident", "Incident retrieved through MCP"],
    ["get_ranked_candidate_changes", "Ranked evidence retrieved through MCP"],
    ["record_analysis_result", "Agent analysis persisted through MCP"]
  ].map(([tool, description]) => {
    const event = successfulTool(state, tool);
    return `<div class="agent-event ${event ? "done" : ""}"><span>${event ? "✓" : "·"}</span>${description}${event ? ` · ${clock(event.timestamp)}` : ""}</div>`;
  }).join("");
  const incident = toolData(successfulTool(state, "get_incident"));
  const evidence = toolData(successfulTool(state, "get_ranked_candidate_changes"));
  element("agent-context").textContent = incident || evidence ? JSON.stringify({
    incident: incident ?? "Not yet recorded",
    ranked_candidates: evidence?.candidates ?? "Not yet recorded"
  }, null, 2) : "Waiting for recorded MCP tool results. Candidate retrieval in this UI is separate from the agent's MCP calls.";
}

function renderAnalysis(state) {
  const analysis = state.analysis;
  element("confidence").textContent = analysis ? `${Math.round(analysis.confidence_score * 100)}% confidence` : "Waiting";
  element("confidence").className = `badge ${analysis ? analysis.confidence_score < 0.65 ? "warn" : "" : "neutral"}`;
  element("analysis").innerHTML = analysis ? `
    <p class="analysis-summary">${escapeHtml(analysis.reasoning_summary)}</p>
    <div class="action-box"><strong>${escapeHtml(label(analysis.recommended_action.type))} · ${escapeHtml(analysis.recommended_action.resource)}</strong>
      ${analysis.recommended_action.from_version ? `${escapeHtml(analysis.recommended_action.from_version)} → ${escapeHtml(analysis.recommended_action.to_version)}` : "Manual review or approved action required"}<br>Attributed change: ${escapeHtml(analysis.probable_change_id ?? "Not established")}</div>
    <ul class="evidence-list">${analysis.evidence.map(item => `<li><span>${escapeHtml(item.description)}</span></li>`).join("")}</ul>`
    : '<p class="muted small">The agent’s recorded recommendation will appear here. Nothing can be approved before it is ready.</p>';
}

function renderOutcome(state) {
  const workflow = state.workflow;
  const status = statusOf(state);
  const action = workflow?.remediation;
  const health = workflow?.health;
  const title = { RESOLVED: "Recovery verified", REJECTED: "Recommendation rejected", ESCALATED: "Human investigation needed", FAILED: "Run failed", CANCELED: "Run cancelled", CANCELLED: "Run cancelled", TERMINATED: "Run terminated", TIMED_OUT: "Run timed out", REMEDIATING: "Simulating remediation…", VERIFYING_HEALTH: "Verifying service health…", AWAITING_APPROVAL: "Paused for your decision" }[status] ?? "Waiting for the next step";
  element("outcome").innerHTML = `<div class="result-card ${tone(status)}"><h3>${title}</h3><p>${escapeHtml(workflow?.error ?? (status === "AWAITING_APPROVAL" ? "Temporal is durably waiting. No remediation has run." : terminalStatuses.has(status) ? "This run is finished. Its history remains available below." : "Confirmed transitions appear below as the workflow advances."))}</p></div>
    ${action ? `<p class="small"><strong>Simulated action:</strong> ${escapeHtml(action.action)} · ${escapeHtml(action.resource)}<br>${escapeHtml(action.message)}</p>` : ""}
    ${health ? `<p class="small"><strong>Health:</strong> ${health.healthy ? "Healthy" : "Degraded"}<br>${escapeHtml(health.message)}</p>` : ""}`;
  element("timeline").innerHTML = (workflow?.timeline ?? []).map(event => `
    <div class="timeline-row"><span>${escapeHtml(label(event.status))}</span><time>${clock(event.timestamp)}</time></div>`).join("");
}

function renderAudit(state) {
  element("audit-count").textContent = `${state.audit.length} recorded events`;
  replaceDetails("audit-events", state.audit.length ? state.audit.map(event => `
    <details class="audit-event" data-key="${escapeHtml(event.id)}"><summary><time>${clock(event.timestamp)}</time><div>${escapeHtml(label(event.action))}<small>${escapeHtml(event.actor_name)} · ${escapeHtml(event.actor_type)}</small></div><span class="badge ${tone(event.status)}">${escapeHtml(label(event.status))}</span></summary><pre>${pretty({ input: event.input, output: event.output, workflow_id: event.workflow_id })}</pre></details>`).join("")
    : '<p class="muted small">No events recorded yet. Start analysis to begin the trace.</p>');
}
