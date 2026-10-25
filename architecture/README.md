# IncidentReport architecture

This describes the implemented repository, not the original proposed roadmap.
The same application image runs the API, worker, migrations, and seed commands.

## System context

An investigator creates an incident and reviews supporting changes. The system
uses stored architecture/change evidence and a configured Groq/Gemini model to
recommend an action. A human must approve any simulated remediation. No real
production remediation is implemented.

## Container-level view (C4-style)

```mermaid
flowchart LR
  human[Investigator / reviewer] -->|HTTP, trusted local demo| api[Fastify API + frontend]
  api -->|incidents, approvals, reads| pg[(PostgreSQL)]
  api -->|start / query / signal| temporal[Temporal server]
  temporal --> history[(Execution history volume)]
  worker[Temporal worker] -->|poll tasks / complete activities| temporal
  worker -->|lifecycle transactions / audit| pg
  subgraph Worker_process_environment
    worker --> graph[LangGraph analysis]
    graph -->|stdio MCP tools| mcp[Compiled MCP subprocess]
  end
  mcp -->|operational data / ranking / analysis persistence| pg
  graph -->|bounded structured-output request| model[Groq or Gemini]
```

The browser cannot access model keys or the database. MCP has no HTTP Service
and does not require its own Kubernetes Deployment. Model keys are configured
only for the worker container. The current MCP child inherits its parent's
environment; that subprocess is a trusted boundary, not a separate security
sandbox. PostgreSQL incident state and Temporal history are independent stores;
both need persistence and backups.

## Dynamic view: incident to outcome

```mermaid
sequenceDiagram
  actor Reviewer
  participant API
  participant DB as PostgreSQL
  participant T as Temporal
  participant W as Worker / LangGraph
  participant MCP
  participant LLM as Groq / Gemini
  Reviewer->>API: Create incident
  API->>DB: Persist incident
  Reviewer->>API: Start analysis
  API->>T: Start incident workflow
  W->>T: Poll analysis activity
  W->>MCP: Get incident and ranked candidates
  MCP->>DB: Read evidence, record tool audits
  W->>W: Check support / ambiguity policy
  opt Evidence supports attribution
    W->>LLM: Evidence + strict output schema
    LLM-->>W: Proposed attribution/action
    W->>W: Validate schema, candidate, approval, confidence
  end
  W->>MCP: Persist supported analysis or manual investigation
  MCP->>DB: Analysis + mandatory audit in one transaction
  W->>DB: Create approval request if supported
  W->>T: Durable approval wait
  Reviewer->>API: Approve or reject
  API->>DB: Commit first human decision + audit
  API->>T: Deliver decision signal
  Note over API,T: If delivery fails, retry identical decision; no automatic outbox
  W->>DB: Validate durable approval; simulate action once
  W->>DB: Record verification + final outcome + audit
  Reviewer->>API: Inspect status, timeline, audit
```

Manual investigation escalates without remediation. Rejection ends without an
action. An approved simulation resolves only when its simulated health check
succeeds; execution failure or unhealthy verification escalates.

## Responsibility boundaries

- **Groq/Gemini:** produces structured suggestions, not authoritative facts.
- **LangGraph:** loads MCP evidence, applies attribution safeguards, invokes
  the model, validates/retries, and records a recommendation/fallback.
- **MCP:** controlled operational reads and persistence; failed calls are
  audited where the database is available. Audit failures are surfaced.
- **Temporal server:** durable history, task dispatch, signals, replay state.
- **Worker:** executes workflow/activity code, runs LangGraph, and waits/replays
  as instructed. It does not periodically scan PostgreSQL to drive the workflow.
- **PostgreSQL:** application records and transactional lifecycle/audit data.

## Deployment and reliability

Compose runs PostgreSQL, persistent development Temporal, API, worker, and an
explicit seed command. Kubernetes uses API/worker Deployments and separate
single-replica StatefulSets/PVCs in its demo overlay. Neither makes the Temporal
dev server a production cluster. Public ingress/auth/TLS are not implemented.

API `/health` is process-only, `/ready` is database-only, and `/ready/workflow`
checks PostgreSQL plus a bounded Temporal gRPC call. Worker port 3001 `/ready`
also requires the SDK run/poller state. Health is not a promise of model quota,
audit durability during an outage, or a successful future incident run.

See [decisions](decisions/README.md), [reliability](../docs/reliability.md),
[Docker](../docs/deployment.md), and [Kubernetes](../deploy/kubernetes/README.md).
