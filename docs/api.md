# Incident API

## Local setup

Start the PostgreSQL and Temporal Docker services, run `npm run migrate`, seed
resources and changes, and start the worker as described in
[temporal.md](temporal.md). Start the API in another terminal:

```powershell
npm run dev
```

The default base URL is `http://localhost:3000`. The API and worker must use
the same `DATABASE_URL`, `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`, and
`TEMPORAL_TASK_QUEUE`. The current worker requires migrations through `003`.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/incidents` | Create an incident; returns `201` |
| GET | `/api/incidents` | List incidents |
| GET | `/api/incidents/:id` | Read incident database status |
| GET | `/api/incidents/:id/candidates` | Read ranked candidate changes |
| POST | `/api/incidents/:id/analyse` | Start the Temporal workflow; returns `202`, or `200` if it already exists |
| GET | `/api/incidents/:id/analysis` | Read the latest persisted analysis and recommendation |
| POST | `/api/incidents/:id/approve` | Persist approval and signal the workflow |
| POST | `/api/incidents/:id/reject` | Persist rejection and signal the workflow |
| GET | `/api/incidents/:id/workflow` | Read execution status, lifecycle phase, recommendation, decision, results, and timeline |
| GET | `/api/incidents/:id/audit-log` | Read chronological, redacted audit events |

Successful responses use `{ "data": ... }`. Errors use
`{ "error": { "code": ..., "message": ..., "request_id": ... } }`.
Send `x-request-id` to correlate requests with logs.

Analysis accepts no body or an optional simulation:

```json
{ "simulation": "UNHEALTHY" }
```

Allowed simulations are `SUCCESS` (default), `REMEDIATION_FAILURE`, and
`UNHEALTHY`. An existing workflow is never restarted or given a new scenario.
Use a fresh incident ID for another run.

Approval body:

```json
{
  "approved_by": "evaluator@example.com",
  "comment": "Reviewed deployment evidence"
}
```

Rejection body:

```json
{
  "rejected_by": "evaluator@example.com",
  "comment": "Manual investigation needed"
}
```

Actor identity must be a nonblank string of at most 200 characters. Comments
are optional strings of at most 2,000 characters. Unknown body fields are
rejected. Identity is supplied by the caller; this local demonstration API
does not authenticate users or authorize approvers. Add authentication and
derive identity from it before exposing these routes outside a trusted environment.

## Decision safety and errors

- `202 SIGNAL_SUBMITTED`: the human decision is committed and its signal
  submitted. This is not a claim that remediation has finished.
- `200 ALREADY_RECORDED`: the workflow already holds the identical decision.
- `400`: invalid body, actor, simulation, or query parameters.
- `404`: incident, workflow, or analysis does not exist.
- `409 APPROVAL_NOT_PENDING`: analysis is not finished or no approval is pending.
- `409 APPROVAL_CONFLICT`: another decision, actor, or comment already won.
- `503 TEMPORAL_UNAVAILABLE`: Temporal could not serve the request.

The first decision is stored under a database row lock **before** signaling.
Concurrent contradictory requests cannot replace it. If signal delivery fails,
retry the same endpoint with exactly the same actor and comment: the stored
decision and timestamp are reused. An identical retry while the workflow is
still processing can return `202` again, without duplicate remediation or audit
records. CLI decisions use the same persistence and delivery path.

The workflow still requires the signal to resume, and its activities
independently verify the durable approval before remediation. Rejection ends
the workflow without remediation. Successful approval resolves the incident;
failed remediation or unhealthy verification escalates it.

Workflow snapshots come from Temporal queries while running and the stored
result after completion. Completed results remain readable without a worker.
An externally failed, cancelled, or terminated execution returns its Temporal
execution status without claiming a completed lifecycle result.

Audit pagination accepts `?limit=100&offset=0`; the limit is clamped to
1–500. Results are ordered by timestamp, then ID. Sensitive keys in audit
inputs and outputs are redacted when read, including older records.

## Example: create, analyse, review, approve

Use a fresh incident ID; the seed does not create incidents. The detection
time below matches the sample deployment evidence.

```powershell
$apiBase = "http://localhost:3000/api/incidents"
$incidentId = "INC-1046"

$incidentBody = @{
  incident_id = $incidentId
  service = "order-service"
  environment = "production"
  symptom = "Order failures increased"
  detected_at = "2026-08-04T08:15:00Z"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri $apiBase -ContentType "application/json" -Body $incidentBody
Invoke-RestMethod -Method Post -Uri "$apiBase/$incidentId/analyse"
Invoke-RestMethod -Uri "$apiBase/$incidentId/workflow"
```

Wait until `data.status` is `AWAITING_APPROVAL`, then review the analysis:

```powershell
Invoke-RestMethod -Uri "$apiBase/$incidentId/analysis"

$approvalBody = @{
  approved_by = "evaluator@example.com"
  comment = "Reviewed deployment evidence"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$apiBase/$incidentId/approve" -ContentType "application/json" -Body $approvalBody
Invoke-RestMethod -Uri "$apiBase/$incidentId/workflow"
Invoke-RestMethod -Uri "$apiBase/$incidentId/audit-log"
```

Poll workflow status until `RESOLVED`, `REJECTED`, `ESCALATED`, or `FAILED`.
Remediation and health checks remain simulations; no production mutation occurs.

## Tests

```powershell
npm run build
npm run test:api
npm run test:temporal
```

API tests use Fastify injection, a real isolated Temporal server, embedded
PostgreSQL, real lifecycle activities, and deterministic analysis without
Gemini. They cover input validation, missing records, early decisions,
concurrent conflicts, failed signal delivery and retry, duplicate starts and
decisions, approval, rejection, unhealthy verification, and completed reads
after worker shutdown. No changes are made to your development database.
