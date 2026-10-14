import { readAudit, request } from "./api.mjs";
import { incidentBody } from "./form.mjs";
import { canAnalyse, canApprove } from "./state.mjs";
import { element, render, renderList } from "./view.mjs";

const state = { incident: null, workflow: null, candidates: null, analysis: null, audit: [], busy: false, offline: false, updatedAt: null };
let incidents = [];
let activeId = null;
let generation = 0;
let inFlight = null;
let controller;

function notice(message, error = false, polling = false) {
  const target = element("notice");
  target.textContent = message;
  target.hidden = !message;
  target.className = `notice ${error ? "error" : ""}`;
  target.dataset.polling = String(polling);
}

function describeError(error) {
  if (error.name === "TimeoutError") return "Request timed out. Check the API, Temporal service, and worker terminals.";
  if (error instanceof TypeError) return "Cannot reach the API. Keep npm run dev running; reconnecting automatically.";
  return error.message;
}

async function loadList() {
  incidents = await request("/api/incidents");
  renderList(incidents, activeId);
}

async function refresh() {
  if (!activeId || inFlight === generation) return;
  const current = generation;
  const path = `/api/incidents/${encodeURIComponent(activeId)}`;
  inFlight = current;
  const signal = controller.signal;
  try {
    const results = await Promise.allSettled([
      request(path, { signal }),
      request(`${path}/candidates`, { signal }),
      request(`${path}/workflow`, { signal, optional: true }),
      request(`${path}/analysis`, { signal, optional: true }),
      readAudit(path, signal)
    ]);
    if (current !== generation || signal.aborted) return;
    const keys = ["incident", "candidates", "workflow", "analysis", "audit"];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") state[keys[index]] = result.value;
    });
    const failures = results.filter(result => result.status === "rejected");
    state.offline = failures.length > 0;
    if (failures.length) notice(describeError(failures[0].reason), true, true);
    else if (element("notice").dataset.polling === "true") notice("");
    state.updatedAt = new Date().toISOString();
    render(state);
    if (state.incident) {
      incidents = incidents.map(item => item.id === state.incident.id ? state.incident : item);
      renderList(incidents, activeId);
    }
  } finally {
    if (inFlight === current) inFlight = null;
  }
}

async function selectIncident(id) {
  controller?.abort();
  controller = new AbortController();
  activeId = id;
  generation++;
  Object.assign(state, { incident: null, workflow: null, candidates: null, analysis: null, audit: [], offline: false });
  notice(`Opening ${id}…`, false, true);
  render(state);
  renderList(incidents, activeId);
  await refresh();
}

async function perform(action) {
  if (state.busy) return;
  state.busy = true;
  render(state);
  try {
    await action();
  } catch (error) {
    notice(describeError(error), true);
  } finally {
    state.busy = false;
    render(state);
  }
}

function sample() {
  const form = element("incident-form");
  form.elements.incident_id.value = `INC-DEMO-${Date.now()}`;
  form.elements.service.value = "order-service";
  form.elements.environment.value = "production";
  form.elements.symptom.value = "Order failures increased after the latest deployment";
  form.elements.detected_at.value = "2026-08-04T08:15:00";
  form.elements.incident_id.focus();
  notice("Sample prepared. Click Create incident to save it; analysis starts only when you ask.");
}

element("sample").addEventListener("click", sample);
element("empty-sample").addEventListener("click", sample);
element("incident-list").addEventListener("click", event => {
  const button = event.target.closest("[data-incident]");
  if (button && !state.busy) selectIncident(button.dataset.incident).catch(error => notice(describeError(error), true));
});
element("refresh-list").addEventListener("click", () => loadList().catch(error => notice(describeError(error), true)));
element("refresh-workflow").addEventListener("click", () => refresh().catch(error => notice(describeError(error), true)));

element("incident-form").addEventListener("submit", event => {
  event.preventDefault();
  perform(async () => {
    const fields = Object.fromEntries(new FormData(event.target));
    const incident = await request("/api/incidents", {
      method: "POST", body: incidentBody(fields)
    });
    await loadList();
    await selectIncident(incident.id);
    notice(`${incident.id} created. Review its candidate changes, then start analysis.`);
  });
});

element("analyse").addEventListener("click", () => {
  if (!canAnalyse(state)) return;
  perform(async () => {
    const result = await request(`/api/incidents/${encodeURIComponent(activeId)}/analyse`, {
      method: "POST", body: { simulation: element("simulation").value }
    });
    notice(result.status === "WORKFLOW_ALREADY_EXISTS" ? "This workflow already exists; observing the current run." : "Workflow started. Watch the confirmed MCP events and live Temporal status below.");
    await refresh();
  });
});

async function decide(decision) {
  if (!canApprove(state)) return;
  const reviewer = element("reviewer");
  if (!reviewer.value.trim()) {
    notice("Enter a reviewer name or email before submitting a decision.", true);
    reviewer.focus();
    return;
  }
  if (!window.confirm(`${decision === "approve" ? "Approve simulated remediation" : "Reject this recommendation"} for ${activeId}? This decision cannot be changed.`)) return;
  await perform(async () => {
    const result = await request(`/api/incidents/${encodeURIComponent(activeId)}/${decision}`, {
      method: "POST", body: {
        [decision === "approve" ? "approved_by" : "rejected_by"]: reviewer.value.trim(),
        ...(element("comment").value ? { comment: element("comment").value } : {})
      }
    });
    notice(result.status === "ALREADY_RECORDED" ? "This decision was already recorded." : "Decision persisted and signal submitted. Temporal will process it next; this is not yet a completed remediation.");
    await refresh();
  });
}

element("approve").addEventListener("click", () => decide("approve"));
element("reject").addEventListener("click", () => decide("reject"));

async function checkHealth() {
  const results = await Promise.allSettled([request("/health"), request("/ready")]);
  const api = results[0].status === "fulfilled";
  const database = results[1].status === "fulfilled";
  element("api-health").className = `connection ${api ? "good" : "bad"}`;
  element("api-health").textContent = api ? "API online" : "API offline";
  element("db-health").className = `connection ${database ? "good" : "bad"}`;
  element("db-health").textContent = database ? "Database ready" : "Database unavailable";
}

async function boot() {
  await checkHealth();
  try {
    await loadList();
  } catch (error) {
    notice(describeError(error), true);
    element("incident-list").textContent = "Unable to load incidents. Check the API terminal, then refresh.";
  }
  setInterval(() => {
    if (!document.hidden) refresh().catch(error => notice(describeError(error), true));
  }, 2000);
  setInterval(() => { if (!document.hidden) checkHealth(); }, 10000);
}

render(state);
boot();
