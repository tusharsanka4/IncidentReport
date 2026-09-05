# Manifest Engineering Take-Home: Working Project Brief

Source: `Manifest-It-project.pdf` (Candidate Project Manual, reference version August 2026)

This document converts the 22-page manual into an implementation-oriented brief. It is not a replacement for the source PDF; it is a checklist and design guide for building the submission.

## 1. The Project in One Paragraph

Build and host an incident-attribution and safe-remediation platform for a fictional e-commerce company, Acme Inc. The platform receives an incident, discovers recent application and infrastructure changes through MCP tools, traverses an architecture dependency graph, deterministically ranks likely causes, uses a LangGraph agent to evaluate the evidence and recommend an action, and lets a Temporal workflow wait durably for explicit human approval. Only after approval may it perform a simulated remediation, check service health, and mark the incident resolved or escalated. Every important user, system, agent, MCP, Temporal, and remediation action must be auditable.

## 2. Non-Negotiable Requirements

The finished submission must:

- Be deployed to a cloud platform and remain reachable during evaluation.
- Be stored in an accessible GitHub repository with meaningful commit history.
- Use LangGraph for the incident-analysis agent.
- Use MCP tools as the agent's interface to operational data; the agent must not query PostgreSQL directly.
- Use Temporal for the durable incident lifecycle.
- Use PostgreSQL as the system of record.
- Include Kubernetes manifests or a Helm chart.
- Require a human approval signal before any remediation can execute.
- Perform remediation only as a simulation.
- Provide an end-to-end audit trail with sensitive values redacted.
- Include automated tests that do not require a paid/live LLM.
- Include CI, deployment configuration, sample data, and full documentation.
- Document how to reproduce the system locally.

Important completion rule: a solution that runs only locally is incomplete.

## 3. Reference Scenario

### Incident

```json
{
  "incident_id": "INC-1042",
  "service": "order-service",
  "environment": "production",
  "symptom": "Order creation failure rate increased from 1% to 18%",
  "detected_at": "2026-08-04T08:15:00Z"
}
```

### Recent changes

```json
[
  {
    "change_id": "CHG-201",
    "resource": "order-service",
    "type": "deployment",
    "version": "v2.4.1",
    "deployed_at": "2026-08-04T08:05:00Z",
    "pipeline": "gh-actions/deploy"
  },
  {
    "change_id": "CHG-202",
    "resource": "redis-cache",
    "type": "configuration",
    "description": "Reduced connection timeout",
    "deployed_at": "2026-08-04T07:55:00Z"
  },
  {
    "change_id": "CHG-203",
    "resource": "catalog-service",
    "type": "deployment",
    "version": "v1.9.0",
    "deployed_at": "2026-08-04T06:30:00Z"
  }
]
```

The likely winner is `CHG-201`: it directly changed the affected service ten minutes before detection. This result must emerge from ranking and evidence, not from a hard-coded incident-specific answer.

## 4. Recommended Product Concept

### Working name: Incident Compass

Build a compact operations console plus documented API. The evaluator submits an incident and watches it progress through a timeline:

1. Incident received.
2. Architecture and recent changes retrieved through MCP.
3. Candidate causes scored with visible score breakdowns.
4. LangGraph produces structured evidence and a concise recommendation.
5. Temporal pauses in `AWAITING_APPROVAL`.
6. An evaluator approves or rejects the recommendation.
7. Approved remediation is simulated exactly once.
8. A simulated health check resolves or escalates the incident.
9. The full audit timeline remains visible.

The differentiating feature should be explainability: show why every candidate gained or lost points and distinguish deterministic facts from the LLM's evidence synthesis.

### Why this scope is strong

- It demonstrates every mandatory integration in one coherent workflow.
- The UI can remain small because a GUI is optional.
- A deterministic demo mode makes the hosted evaluation reliable.
- The candidate-ranking explanation directly addresses an important evaluation criterion.
- It leaves room for polish without depending on ambitious bonus features.

## 5. Suggested Technical Architecture

Prefer a TypeScript monorepo to reduce context switching and share schemas across the API, agent, MCP server, and Temporal worker.

```text
Evaluator / Optional React UI
              |
              v
        TypeScript API
       /       |       \
      v        v        v
PostgreSQL  Temporal   Read APIs
                |
                v
        Temporal Worker
                |
                v
        LangGraph Agent
                |
                v
            MCP Server
                |
                v
          PostgreSQL / simulators
```

### Responsibility boundaries

#### API

- Validates HTTP input and produces structured errors.
- Creates and retrieves incidents.
- Starts workflows and prevents duplicate starts.
- Sends approve/reject signals to Temporal.
- Exposes analysis, candidates, workflow status, and audit history.
- Does not run the agent or remediation inline.

#### Temporal

- Owns the durable lifecycle and status transitions.
- Calls activities that invoke analysis, create approval requests, remediate, and verify health.
- Waits for approval/rejection/cancellation signals.
- Exposes status, recommendation, approval, and timeline queries.
- Keeps workflow code deterministic; all I/O belongs in activities.

#### LangGraph

- Owns the bounded analysis process.
- Maintains explicit analysis state.
- Calls MCP tools for incident/change/dependency data.
- Handles no-candidate, low-confidence, tool-failure, invalid-output, and unsupported-action branches.
- Produces structured evidence and a short reasoning summary, never hidden chain-of-thought.

#### MCP server

- Is the agent's only gateway to operational data.
- Validates tool inputs and returns structured outputs/errors.
- Records meaningful tool audit events.
- Redacts secrets and returns secret metadata only.

#### PostgreSQL

- Is the durable source of truth for incidents, changes, resources, relationships, analyses, approvals, audit events, and remediation attempts.

## 6. Proposed Repository Layout

```text
README.md
LICENSE
.env.example
package.json
pnpm-workspace.yaml
docker-compose.yml
apps/
  api/
  web/                    # optional but recommended if time permits
  agent-worker/
  mcp-server/
  temporal-worker/
packages/
  contracts/              # shared schemas, DTOs and domain types
  database/               # migrations, repositories and seeds
  ranking/                # deterministic candidate-ranking engine
  audit/                  # audit helpers and redaction
  observability/          # logging, request IDs and metrics
architecture/
  component-diagram.md
  sequence-diagram.md
  langgraph-diagram.md
  temporal-diagram.md
deploy/
  kubernetes/
  helm/                    # use either Helm or plain manifests; Helm is a bonus
docs/
  api.md
  deployment.md
  demo.md
  decisions/
sample-data/
  incidents.json
  changes.json
  dependencies.json
tests/
  integration/
  end-to-end/
.github/workflows/
  ci.yml
  deploy.yml              # optional bonus
```

Do not create separate deployable services merely for appearance. A practical version can combine the LangGraph runner with the Temporal worker while retaining clean package boundaries. The MCP server should remain a real MCP boundary.

## 7. Acme Dependency Graph

The reference application is:

```text
CloudFront CDN
  -> storefront-ui
    -> api-gateway
      -> order-service
        -> postgres/orders
        -> redis-cache
        -> vault/prod/acme/*
        -> gh-actions/deploy
      -> catalog-service
        -> redis-cache
        -> vault/prod/acme/*
        -> gh-actions/deploy
      -> payment-service
        -> sqs/order-events
        -> vault/prod/acme/*
        -> gh-actions/deploy
```

The graph must answer:

- What resources does `order-service` depend on?
- Which services are affected by `redis-cache`?
- Is `catalog-service` directly or indirectly related to `order-service`?
- Which pipeline can modify `order-service`?

Recommended implementation: model resources and directed edges in PostgreSQL, then use a bounded breadth-first traversal in application code. This is easy to test, supports dependency distance, and avoids adding a graph database solely for a small graph.

## 8. PostgreSQL Model

The manual explicitly calls for these entities.

### `incidents`

- `id`
- `service`
- `environment`
- `symptom`
- `detected_at`
- `status`
- `created_at`
- `updated_at`

Suggested statuses: `RECEIVED`, `ANALYSING`, `AWAITING_APPROVAL`, `APPROVED`, `REJECTED`, `REMEDIATING`, `RESOLVED`, `ESCALATED`, `FAILED`.

### `changes`

- `id`
- `resource`
- `change_type`
- `description`
- `version`
- `deployed_at`
- `source`
- `metadata` (`JSONB`)
- `created_at`

### `resources`

- `id`
- `name`
- `resource_type`
- `environment`
- `metadata` (`JSONB`)
- `created_at`

### `resource_relationships`

- `id`
- `source_resource_id`
- `target_resource_id`
- `relationship_type`
- `created_at`

Relationship types include `DEPENDS_ON`, `DEPLOYED_BY`, `READS_FROM`, `WRITES_TO`, `USES_SECRET`, `PUBLISHES_TO`, `CONSUMES_FROM`, and `HOSTED_ON`.

### `analysis_results`

- `id`
- `incident_id`
- `probable_change_id`
- `confidence_score`
- `reasoning_summary`
- `evidence` (`JSONB`)
- `recommended_action` (`JSONB`)
- `analysis_status`
- `created_at`

### `approval_requests`

- `id`
- `incident_id`
- `analysis_id`
- `requested_action`
- `status`
- `requested_at`
- `responded_at`
- `responded_by`
- `comment`

### `audit_events`

- `id`
- `incident_id`
- `workflow_id`
- `actor_type`
- `actor_name`
- `action`
- `input` (`JSONB`, redacted)
- `output` (`JSONB`, redacted)
- `status`
- `timestamp`

Actor types: `USER`, `AGENT`, `MCP_TOOL`, `TEMPORAL_WORKFLOW`, `TEMPORAL_ACTIVITY`, `SYSTEM`.

### Recommended additions

- `remediation_attempts` for idempotency and controlled failure simulation.
- Unique workflow/business keys such as one active workflow per incident.
- A unique idempotency key on approval decisions and remediation attempts.
- Database constraints for valid status transitions where practical.

## 9. Required API

### Health

- `GET /health`
- `GET /ready`

### Incidents

- `POST /api/incidents`
- `GET /api/incidents/:id`
- `GET /api/incidents`

### Analysis

- `POST /api/incidents/:id/analyse`
- `GET /api/incidents/:id/analysis`
- `GET /api/incidents/:id/candidates`

### Approval

- `POST /api/incidents/:id/approve`
- `POST /api/incidents/:id/reject`

### Workflow and audit

- `GET /api/incidents/:id/workflow`
- `GET /api/incidents/:id/audit-log`

Every endpoint should use validation, appropriate status codes, request/correlation IDs, structured logs and errors, safe database handling, and graceful shutdown. Analysis starts must be duplicate-safe; approval and remediation must be idempotent.

Suggested error shape:

```json
{
  "error": {
    "code": "INCIDENT_NOT_FOUND",
    "message": "Incident INC-1042 was not found",
    "request_id": "req-12345"
  }
}
```

## 10. Deterministic Candidate Ranking

Do filtering and initial ranking before the LLM. A transparent baseline:

| Factor | Score |
|---|---:|
| Change directly targets affected service | +40 |
| Change targets a direct dependency | +25 |
| Change targets an indirect dependency | +10 |
| Change occurred within 15 minutes | +25 |
| Change occurred within 60 minutes | +15 |
| Same environment | +10 |
| Deployment or configuration source is relevant | +5 |
| Supporting evidence exists | +5 to +15 |
| Conflicting evidence exists | -5 to -20 |
| Unrelated resource | -30 |
| Change occurred several hours earlier | -15 |

Recommended confidence design:

1. Calculate a raw score with a stored factor-by-factor breakdown.
2. Clamp it to a documented range, for example `[-50, 100]`.
3. Normalize it to `[0, 1]`.
4. Account for separation between the first and second candidate; a narrow lead should reduce confidence.
5. Let the LLM assess and summarize supplied evidence, but do not let it silently replace the deterministic score.

Example candidate response:

```json
{
  "change_id": "CHG-201",
  "raw_score": 80,
  "normalized_score": 0.87,
  "factors": [
    { "name": "DIRECT_RESOURCE_MATCH", "score": 40 },
    { "name": "WITHIN_15_MINUTES", "score": 25 },
    { "name": "SAME_ENVIRONMENT", "score": 10 },
    { "name": "RELEVANT_CHANGE_TYPE", "score": 5 }
  ]
}
```

Unit-test this package independently from the agent and LLM.

## 11. MCP Tool Surface

Required tools:

- `get_incident`
- `get_recent_changes`
- `get_resource_dependencies`
- `record_analysis_result`

Recommended tools:

- `get_ranked_candidate_changes`
- `get_change_details`
- `get_deployment_details`
- `get_service_health`
- `get_secret_metadata`
- `create_approval_request`
- `get_approval_status`
- `start_simulated_remediation`
- `record_audit_event`

Each tool must:

- Validate input.
- Return machine-readable data and structured errors.
- Record meaningful audit information.
- Be independently testable.
- Never expose credentials or secret values.

Do not let the LangGraph agent import database repositories. Enforce the boundary structurally, not merely by convention.

## 12. LangGraph Design

Suggested graph:

```text
loadIncident
  -> findRelatedResources
  -> retrieveRecentChanges
  -> rankCandidates
  -> evaluateEvidence
  -> generateExplanation
  -> recommendAction
  -> validateRecommendation
  -> storeAnalysis
  -> requestHumanApproval
```

Required behavior:

- Explicit state management.
- MCP tool invocation.
- Conditional branches.
- Error handling and retry/recovery paths.
- Maximum iteration limit.
- Human-in-the-loop behavior.
- Strict separation between analysis and execution.

Required branches include:

- No relevant changes.
- Low-confidence conclusion.
- MCP tool failure.
- Invalid LLM output.
- Unsupported remediation.
- Approval required.
- Manual investigation required.

Suggested state:

```ts
interface IncidentAnalysisState {
  incidentId: string;
  incident?: Incident;
  dependencies: ResourceDependency[];
  recentChanges: Change[];
  rankedCandidates: RankedCandidate[];
  evidence: EvidenceItem[];
  probableChangeId?: string;
  confidence?: number;
  reasoningSummary?: string;
  recommendation?: RemediationRecommendation;
  errors: WorkflowError[];
  iterationCount: number;
}
```

The LLM output must be schema-validated. Store structured evidence, scores, summaries, and recommendations only—never hidden chain-of-thought.

## 13. Temporal Workflow Design

Suggested lifecycle:

```text
Incident received
  -> run analysis activity
  -> store recommendation
  -> wait for signal
       -> rejected: record rejection and stop/escalate
       -> approved: execute simulated remediation activity
                    -> verify health activity
                         -> healthy: RESOLVED
                         -> unhealthy: ESCALATED
```

Temporal requirements:

- Survive worker restarts.
- Approval and rejection are Temporal signals.
- Consider a cancellation signal (`cancelIncident`).
- Expose queries for status, recommendation, approval, and timeline.
- Configure activity timeouts and appropriate retry policies.
- Keep workflow code deterministic.
- Make every activity idempotent.
- Audit state changes.
- Escalate failed or unhealthy remediation.

Safety invariant:

```text
No valid approval record + no accepted approval signal = no remediation activity
```

Enforce that invariant both in the workflow and inside the remediation activity. Defense in depth is valuable here.

## 14. Simulated Remediation

A simulated rollback should still behave like a production operation:

- Validate the target service and allowed action.
- Re-check that approval exists.
- Use an idempotency key to prevent duplicate execution.
- Record the requested action and result.
- Support an explicitly controlled failure scenario.
- Trigger a simulated health check.
- Return structured output.

Example:

```json
{
  "action": "rollback",
  "service": "order-service",
  "from_version": "v2.4.1",
  "to_version": "v2.4.0",
  "execution": "simulated",
  "result": "success"
}
```

## 15. Audit and Security

Audit at least:

- Incident creation.
- Analysis request.
- Workflow start and state transitions.
- LangGraph node transitions.
- MCP calls.
- Candidate ranking and score breakdown.
- LLM request metadata and response summary.
- Recommendation and approval request.
- Human approval/rejection.
- Remediation attempt.
- Health verification.
- Completion or escalation.

Security rules:

- Never commit live secrets.
- Use environment variables and Kubernetes Secrets.
- Return Vault/secret metadata only.
- Redact tokens, passwords, authorization headers, and secret-shaped fields before logging or auditing.
- Validate all API and MCP inputs.
- Restrict allowed remediation types/resources with policy code.
- Treat approval identity and comment as audit data.
- Do not store raw model chain-of-thought.

## 16. Required Automated Tests

The manual lists these minimum scenarios:

1. Incident creation.
2. Incident validation failure.
3. Dependency traversal.
4. Candidate-change ranking.
5. MCP tool invocation.
6. LangGraph workflow completion.
7. Low-confidence analysis path.
8. Temporal approval signal.
9. Temporal rejection signal.
10. Temporal activity retry.
11. Duplicate approval handling.
12. Remediation failure and escalation.
13. Audit-log creation.
14. Secret redaction.
15. Health and readiness endpoints.

Use a deterministic fake analysis model in tests so CI requires neither network access nor paid LLM calls. Temporal's test environment should be used for workflow time-skipping and signal tests.

## 17. Deployment Requirements

Include Kubernetes resources or a Helm chart for:

- API.
- LangGraph agent service/worker.
- MCP server.
- Temporal worker.
- PostgreSQL or managed PostgreSQL connectivity.
- Temporal dev/self-hosted service or Temporal Cloud connectivity.

Where applicable include Deployments, Services, Ingress, ConfigMaps, Secrets, liveness/readiness probes, resource requests/limits, persistent storage, migrations, and environment configuration.

### Practical hosting choices

#### Lean demo deployment

- A small hosted Kubernetes cluster (for example k3s on a VM).
- PostgreSQL in-cluster with persistent volume or a managed free/low-cost database.
- Temporal dev server/self-hosted Temporal for the evaluation environment.
- Ingress with TLS.

This minimizes vendor-specific code but puts more operational responsibility on the candidate.

#### Managed deployment

- Managed Kubernetes.
- Managed PostgreSQL.
- Temporal Cloud.

This is operationally stronger but may cost more and requires securely sharing evaluation access where relevant.

Whichever path is chosen, document trade-offs and make the hosted workflow reliable and easy to evaluate.

## 18. Evaluator's Required Walkthrough

The evaluator must be able to:

1. Call `GET /health` and receive a healthy response.
2. Create `INC-1042`.
3. Start its analysis.
4. Retrieve ranked candidate changes.
5. Retrieve the analysis and recommendation.
6. See workflow status `AWAITING_APPROVAL`.
7. Approve or reject the recommendation.
8. Observe the workflow become `RESOLVED` or `ESCALATED`.
9. Retrieve the complete audit trail.

Design the seed command and demo documentation so this walkthrough works without manual database editing.

## 19. Evaluation Weights

| Area | Weight |
|---|---:|
| End-to-end functional completeness | 20% |
| Code quality and project structure | 15% |
| LangGraph and agent design | 15% |
| Temporal workflow design | 15% |
| MCP implementation | 10% |
| PostgreSQL modelling | 10% |
| Cloud and Kubernetes deployment | 10% |
| Documentation, tests and CI | 5% |

Prioritize a small, reliable end-to-end path before bonus features. The manual explicitly prefers a smaller dependable implementation to a larger incomplete one.

## 20. Build Plan

### Phase 1: Foundation

- Create TypeScript workspace, shared contracts, linting, formatting, and test setup.
- Add Docker Compose for PostgreSQL and Temporal local development.
- Add database migrations and deterministic seed data.
- Implement request IDs, structured logging, errors, and audit redaction helpers.

### Phase 2: Deterministic core

- Implement graph traversal.
- Implement ranking with score breakdowns and confidence calculation.
- Build unit tests for both.
- Implement basic incident/read APIs.

### Phase 3: MCP and agent

- Implement required MCP tools first.
- Add tool-level validation, audit, and tests.
- Build the LangGraph with deterministic fake-model support.
- Add all required branches and schema validation.

### Phase 4: Temporal and approvals

- Implement workflow, activities, signals, and queries.
- Wire API start/approve/reject endpoints to Temporal.
- Implement idempotent simulated remediation and health verification.
- Add Temporal workflow tests.

### Phase 5: End-to-end and documentation

- Add integration and full walkthrough tests.
- Generate OpenAPI and include copy-paste examples.
- Write architecture, deployment, demo, security, assumptions, and limitations docs.
- Add CI.

### Phase 6: Hosting and polish

- Add Kubernetes/Helm deployment configuration.
- Deploy, migrate, seed, and verify the public endpoints.
- Add optional UI or observability only after the mandatory walkthrough is stable.

## 21. Product Ideas and Scope Options

### Idea A: Incident Compass (recommended)

An explainable incident console centered on a ranked-candidate table, evidence panel, approval gate, and audit timeline. It is the clearest match to the assignment and easiest to demonstrate reliably.

### Idea B: Change Blast-Radius Explorer

Make the dependency graph the visual centerpiece. Selecting a change shows affected services, dependency distance, related incidents, and attribution score. This is visually compelling, but graph UI work should wait until the API workflow is complete.

### Idea C: Safe Remediation Control Room

Focus the interface on policy checks, approval state, idempotency, workflow history, and remediation verification. This strongly demonstrates production thinking and Temporal expertise.

### Idea D: Evidence Replay Lab

Allow evaluators to choose seeded scenarios—direct deployment regression, shared-cache issue, unrelated change, low-confidence case, and remediation failure—and replay the same deterministic workflow. This is an excellent testing/demo enhancement after the main scenario works.

### Best combined scope

Build Idea A as the core product and add a small part of Idea D: three seeded scenarios selectable through API or UI. This shows the solution is general rather than hard-coded without creating an oversized project.

Suggested scenarios:

1. `INC-1042`: direct `order-service` deployment, high-confidence rollback.
2. Shared Redis change: two affected services, medium-confidence configuration revert.
3. No relevant recent change: low confidence, manual investigation/escalation.
4. Optional controlled remediation failure: approved action ends in `ESCALATED`.

## 22. Good Bonus Features, in Priority Order

Only add these after the required walkthrough is solid:

1. React incident timeline and approval UI.
2. Server-Sent Events for live workflow updates.
3. OpenTelemetry traces correlated by incident/workflow/request ID.
4. Multi-level dependency visualization.
5. Policy engine that rejects unsupported or unapproved actions.
6. Prometheus metrics.
7. Helm chart.
8. Authentication and role-based approval.
9. GitOps or automated hosted deployment.
10. Multiple LLM providers.

## 23. Common Failure Modes to Avoid

- Letting the LLM discover and rank all candidates without deterministic scoring.
- Letting the agent query PostgreSQL directly instead of using MCP.
- Treating LangGraph and Temporal as interchangeable orchestration layers.
- Running remediation in the API handler or LangGraph before Temporal approval.
- Claiming idempotency without database-backed uniqueness or durable state.
- Using a fake approval flag rather than a Temporal signal.
- Logging secrets or model chain-of-thought.
- Having Kubernetes YAML that was never used for the hosted environment.
- Requiring evaluator-specific manual setup beyond documented credentials.
- Spending time on UI before the end-to-end workflow and tests pass.
- Shipping a single giant commit.

## 24. Definition of Done

- [ ] Hosted solution is reachable.
- [ ] Health endpoint works.
- [ ] Full incident workflow can be demonstrated.
- [ ] GitHub repository is accessible.
- [ ] No credentials or secrets are committed.
- [ ] Migrations and sample data are included.
- [ ] MCP tools are implemented and tested.
- [ ] LangGraph uses explicit state and required branches.
- [ ] Temporal durably orchestrates the lifecycle.
- [ ] Human approval is mandatory before remediation.
- [ ] Remediation is simulated, idempotent, and audited.
- [ ] Kubernetes or Helm deployment files are included and reproducible.
- [ ] Required automated tests pass without a live paid LLM.
- [ ] CI runs on pushes and pull requests.
- [ ] Local setup documentation is complete.
- [ ] Hosted evaluation instructions are complete.
- [ ] Architecture and workflow diagrams are included.
- [ ] README explains technology decisions, security, assumptions, and limitations.

## 25. Immediate Decisions Before Coding

The following choices should be made once, documented, and then kept stable:

1. TypeScript monorepo tooling: `pnpm` is a practical default.
2. API framework: Fastify is a good fit for validation and structured logging; NestJS is reasonable if already familiar.
3. Database layer: Drizzle or Prisma; use explicit SQL migrations either way.
4. LLM provider: keep it behind an interface and provide a deterministic fake implementation.
5. Cloud target: choose based on available credits and Kubernetes familiarity.
6. UI scope: API-first, then a small React console if time remains.
7. Kubernetes packaging: plain manifests first; Helm only if it will actually be tested.

Recommended default stack: TypeScript, pnpm workspaces, Fastify, Zod, Drizzle, PostgreSQL, LangGraph.js, MCP TypeScript SDK, Temporal TypeScript SDK, Vitest, Docker Compose, Kubernetes, and a minimal React/Vite UI after the backend path works.
