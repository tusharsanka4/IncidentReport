# Incident Compass — Implementation Roadmap

This roadmap turns the requirements in `Manifest-It-project.pdf` and `PROJECT_BRIEF.md` into an executable development sequence.

## Delivery Strategy

Build one reliable vertical slice first:

```text
Create incident
  -> start analysis
  -> retrieve data through MCP
  -> rank candidate changes
  -> generate recommendation
  -> wait for Temporal approval signal
  -> simulate remediation
  -> verify health
  -> resolve or escalate
  -> inspect complete audit trail
```

Everything required for that flow is core scope. UI polish, streaming updates, advanced observability, Helm, and other enhancements remain optional until the vertical slice is deployed and tested.

## Proposed Stack

- Language: TypeScript
- Runtime: Node.js 22 LTS
- Workspace: pnpm workspaces
- API: Fastify
- Validation and shared schemas: Zod
- Database: PostgreSQL
- Database layer: Drizzle ORM with SQL migrations
- Agent: LangGraph.js
- Operational tool boundary: MCP TypeScript SDK
- Durable orchestration: Temporal TypeScript SDK
- Tests: Vitest, Fastify injection, Testcontainers where appropriate, Temporal test server
- Local infrastructure: Docker Compose
- Deployment: Kubernetes manifests first
- API documentation: OpenAPI/Swagger
- Optional UI: React and Vite

Pin exact dependency versions when scaffolding rather than relying on floating `latest` versions.

## Milestone Overview

| Milestone | Outcome | Suggested effort |
|---|---|---:|
| M0 — Decisions and skeleton | Runnable monorepo and documented architecture | 0.5–1 day |
| M1 — Data foundation | PostgreSQL schema, migrations, seeds, repositories | 1–1.5 days |
| M2 — Deterministic analysis | Dependency traversal and explainable ranking | 1–1.5 days |
| M3 — API foundation | Incident, analysis-read, health, and audit endpoints | 1–1.5 days |
| M4 — MCP boundary | Tested MCP tools over operational data | 1–1.5 days |
| M5 — LangGraph agent | Structured, bounded evidence-based analysis | 1.5–2 days |
| M6 — Temporal lifecycle | Durable approval, remediation, and verification flow | 2–2.5 days |
| M7 — End-to-end hardening | Full walkthrough, failures, idempotency, security | 1.5–2 days |
| M8 — Deployment | Reachable Kubernetes-hosted solution | 1–2 days |
| M9 — Submission readiness | Documentation, CI, diagrams, final verification | 1–1.5 days |
| Optional polish | UI, SSE, telemetry, Helm, metrics | Only after M9 |

Approximate core implementation: 12–16 focused engineering days. This is a planning estimate, not a deadline.

---

## M0 — Architecture Decisions and Repository Skeleton

### Objective

Establish a clean workspace in which every service starts, shares contracts safely, and can be tested independently.

### Tasks

- [ ] Initialize Git and create the remote GitHub repository.
- [ ] Configure pnpm workspaces and root scripts.
- [ ] Add TypeScript strict configuration shared across packages.
- [ ] Add ESLint, formatting, Vitest, and build/type-check scripts.
- [ ] Create initial workspace structure:
  - [ ] `apps/api`
  - [ ] `apps/mcp-server`
  - [ ] `apps/temporal-worker`
  - [ ] `packages/contracts`
  - [ ] `packages/database`
  - [ ] `packages/ranking`
  - [ ] `packages/audit`
- [ ] Add `.env.example` and a checked-in configuration schema.
- [ ] Add Docker Compose services for PostgreSQL and Temporal local development.
- [ ] Add initial `/health` process-level endpoint.
- [ ] Record architectural decisions:
  - [ ] TypeScript-first approach
  - [ ] LangGraph versus Temporal responsibility split
  - [ ] MCP data-access boundary
  - [ ] PostgreSQL graph representation
  - [ ] Deterministic ranking versus LLM reasoning
- [ ] Add a basic CI workflow for install, lint, type-check, and unit tests.

### Acceptance gate

- `pnpm install`, `pnpm build`, `pnpm typecheck`, and `pnpm test` succeed.
- Local PostgreSQL and Temporal can start through documented commands.
- No secret values exist in tracked files.
- Workspace packages compile under strict TypeScript settings.

### Suggested commit

`chore: scaffold typescript workspace and local infrastructure`

---

## M1 — PostgreSQL Model, Migrations, and Seed Data

### Objective

Create the system of record and deterministic reference data used by every later milestone.

### Tasks

- [ ] Implement tables and migrations for:
  - [ ] incidents
  - [ ] changes
  - [ ] resources
  - [ ] resource relationships
  - [ ] analysis results
  - [ ] approval requests
  - [ ] audit events
  - [ ] remediation attempts
- [ ] Define status enums and allowed domain values.
- [ ] Add indexes for incident lookup, recent-change queries, relationships, workflow IDs, and audit timelines.
- [ ] Add foreign keys, timestamps, and uniqueness constraints.
- [ ] Add idempotency constraints for workflow start, approval decisions, and remediation execution.
- [ ] Implement database connection lifecycle and graceful shutdown.
- [ ] Add repository interfaces and PostgreSQL implementations.
- [ ] Seed the Acme architecture graph.
- [ ] Seed `INC-1042` changes plus additional scenarios:
  - [ ] shared Redis incident
  - [ ] low-confidence/no-relevant-change incident
  - [ ] controlled remediation failure incident
- [ ] Add migration and seed commands.
- [ ] Test migrations, constraints, repositories, and repeatable seeds.

### Important design decisions

- Use directed relationship edges with explicit relationship types.
- Store flexible evidence/tool metadata as `JSONB` while keeping query-critical fields relational.
- Preserve audit events as append-only application data.
- Use application guards plus database uniqueness for idempotency.

### Acceptance gate

- A clean database can be migrated and seeded with one documented command sequence.
- Running seeds twice is safe.
- `INC-1042`, all three sample changes, and the complete Acme dependency graph can be queried.
- Invalid references and duplicate idempotency keys are rejected.

### Suggested commits

- `feat(db): add incident attribution schema and migrations`
- `feat(db): seed acme architecture and evaluation scenarios`

---

## M2 — Dependency Traversal and Candidate Ranking

### Objective

Implement the deterministic core before introducing the agent or LLM.

### Tasks

- [ ] Implement bounded breadth-first dependency traversal.
- [ ] Support forward and reverse dependency queries.
- [ ] Return relationship type, path, and dependency distance.
- [ ] Protect traversal against cycles and excessive depth.
- [ ] Implement candidate filtering by time window and environment.
- [ ] Implement documented scoring factors:
  - [ ] direct affected-service match
  - [ ] direct dependency match
  - [ ] indirect dependency match
  - [ ] temporal proximity
  - [ ] environment match
  - [ ] change-type/source relevance
  - [ ] supporting evidence
  - [ ] conflicting evidence
  - [ ] unrelated-resource penalty
  - [ ] stale-change penalty
- [ ] Return a factor-by-factor score breakdown.
- [ ] Normalize scores into confidence values.
- [ ] Reduce confidence when the two leading candidates are too close.
- [ ] Define thresholds for high confidence, low confidence, and manual investigation.
- [ ] Make ranking weights configurable but validated.
- [ ] Add unit tests for ordering, ties, time boundaries, graph distance, unrelated changes, and empty results.

### Acceptance gate

- `CHG-201` ranks first for `INC-1042` for documented reasons.
- The output contains enough detail to reproduce the score.
- Low-confidence and no-candidate cases are explicit outcomes.
- Tests do not call an LLM, MCP server, or external service.

### Suggested commits

- `feat(graph): add bounded resource dependency traversal`
- `feat(ranking): add explainable deterministic change scoring`

---

## M3 — API Foundation

### Objective

Expose reliable incident-management and read APIs before orchestration is connected.

### Tasks

- [ ] Implement Fastify application lifecycle.
- [ ] Add configuration validation at startup.
- [ ] Add structured logging and request/correlation IDs.
- [ ] Add standard structured errors.
- [ ] Add OpenAPI generation and Swagger UI.
- [ ] Implement:
  - [ ] `GET /health`
  - [ ] `GET /ready`
  - [ ] `POST /api/incidents`
  - [ ] `GET /api/incidents`
  - [ ] `GET /api/incidents/:id`
  - [ ] `GET /api/incidents/:id/candidates`
  - [ ] `GET /api/incidents/:id/analysis`
  - [ ] `GET /api/incidents/:id/audit-log`
- [ ] Create audit events for incident creation and analysis requests.
- [ ] Implement pagination for list and audit endpoints.
- [ ] Add readiness checks for critical dependencies.
- [ ] Add graceful shutdown.
- [ ] Add API tests using Fastify injection.

### Acceptance gate

- Incident input validation and structured failure responses work.
- Request IDs appear in responses, logs, and relevant audit events.
- Health remains lightweight; readiness reflects dependency availability.
- OpenAPI documents every implemented endpoint and schema.

### Suggested commit

`feat(api): add incident, health, analysis, and audit endpoints`

---

## M4 — MCP Operational Data Boundary

### Objective

Expose all agent-accessible operational data through independently testable MCP tools.

### Tasks

- [ ] Start an MCP server using the TypeScript SDK.
- [ ] Implement required tools:
  - [ ] `get_incident`
  - [ ] `get_recent_changes`
  - [ ] `get_resource_dependencies`
  - [ ] `record_analysis_result`
- [ ] Implement recommended tools needed by our graph:
  - [ ] `get_ranked_candidate_changes`
  - [ ] `get_change_details`
  - [ ] `get_service_health`
  - [ ] `create_approval_request`
  - [ ] `get_approval_status`
  - [ ] `start_simulated_remediation`
  - [ ] `record_audit_event`
- [ ] Define Zod schemas for every tool input and output.
- [ ] Add stable structured error codes.
- [ ] Record tool invocation/result summaries in the audit log.
- [ ] Redact sensitive fields before audit persistence.
- [ ] Ensure secret tools return metadata only.
- [ ] Add direct MCP integration tests.
- [ ] Enforce package boundaries so agent code cannot import database repositories.

### Acceptance gate

- All required tool calls work against seeded data.
- Invalid tool input produces a structured tool error.
- Tool calls generate safe audit events.
- The agent package has no direct database dependency.

### Suggested commit

`feat(mcp): expose audited incident investigation tools`

---

## M5 — LangGraph Incident-Attribution Agent

### Objective

Build a bounded agent that gathers facts via MCP and emits schema-validated evidence and recommendations.

### Tasks

- [ ] Define `IncidentAnalysisState` and reducer behavior.
- [ ] Implement graph nodes:
  - [ ] load incident
  - [ ] find related resources
  - [ ] retrieve recent changes
  - [ ] rank candidates
  - [ ] evaluate evidence
  - [ ] generate explanation
  - [ ] recommend action
  - [ ] validate recommendation
  - [ ] store analysis
  - [ ] request human approval
- [ ] Implement branches for:
  - [ ] no relevant changes
  - [ ] low confidence
  - [ ] MCP failure
  - [ ] retryable versus terminal tool errors
  - [ ] invalid model output
  - [ ] unsupported remediation
  - [ ] manual investigation
- [ ] Enforce a maximum iteration/retry count.
- [ ] Define the supported remediation allowlist.
- [ ] Validate model output with shared schemas.
- [ ] Build an LLM adapter interface.
- [ ] Implement a deterministic fake model for tests and demo fallback.
- [ ] Implement the chosen production model adapter through environment configuration.
- [ ] Store evidence and concise reasoning summaries only.
- [ ] Audit node transitions, model metadata, result summaries, and failures.
- [ ] Add unit and graph-level tests for every required branch.

### Acceptance gate

- The agent reaches a stored analysis for `INC-1042` using MCP calls only.
- The result identifies `CHG-201`, returns structured evidence, and recommends a simulated rollback requiring approval.
- Invalid model output is retried within limits and then handled safely.
- No raw chain-of-thought is requested or stored.
- CI passes with the deterministic fake model and no API key.

### Suggested commits

- `feat(agent): add langgraph incident attribution workflow`
- `test(agent): cover recovery and low-confidence branches`

---

## M6 — Temporal Workflow, Approval, and Remediation

### Objective

Orchestrate the complete incident lifecycle durably and enforce the human approval invariant.

### Tasks

- [ ] Implement Temporal activities for:
  - [ ] running LangGraph analysis
  - [ ] persisting recommendation/approval request
  - [ ] executing simulated remediation
  - [ ] verifying simulated service health
  - [ ] recording lifecycle audit events
- [ ] Implement the incident workflow.
- [ ] Add signals:
  - [ ] `approveRemediation`
  - [ ] `rejectRemediation`
  - [ ] `cancelIncident`
- [ ] Add queries:
  - [ ] `getStatus`
  - [ ] `getRecommendation`
  - [ ] `getApprovalStatus`
  - [ ] `getTimeline`
- [ ] Configure activity timeouts and retry policies.
- [ ] Make workflow IDs deterministic from incident IDs.
- [ ] Add duplicate workflow-start protection.
- [ ] Make approval decisions idempotent and conflict-aware.
- [ ] Make remediation activity idempotent with a database constraint.
- [ ] Validate approval again inside the remediation activity.
- [ ] Add controlled health-success and health-failure behavior.
- [ ] Move failed/unhealthy outcomes to `ESCALATED`.
- [ ] Connect API endpoints:
  - [ ] `POST /api/incidents/:id/analyse`
  - [ ] `POST /api/incidents/:id/approve`
  - [ ] `POST /api/incidents/:id/reject`
  - [ ] `GET /api/incidents/:id/workflow`
- [ ] Add Temporal workflow tests using signals and time-skipping.

### Safety invariant

No remediation activity may execute unless the workflow has accepted an approval signal and a valid durable approval record exists.

### Acceptance gate

- A workflow survives worker restart while awaiting approval.
- Rejection never invokes remediation.
- Approval invokes remediation once, even if the API call is repeated.
- Healthy verification produces `RESOLVED`.
- Failed remediation or unhealthy verification produces `ESCALATED`.
- Queries return current workflow state without mutating it.

### Suggested commits

- `feat(workflow): orchestrate durable incident approval lifecycle`
- `feat(remediation): add idempotent simulated rollback and verification`
- `test(workflow): cover signals retries and escalation`

---

## M7 — End-to-End Hardening

### Objective

Prove that the entire evaluator walkthrough and important failure paths work as one system.

### Tasks

- [ ] Add an end-to-end test for the happy path.
- [ ] Add an end-to-end rejection path.
- [ ] Add a low-confidence/manual-investigation path.
- [ ] Add remediation-failure/escalation path.
- [ ] Verify duplicate analysis, approval, rejection, and remediation requests.
- [ ] Verify conflicting approval decisions return safe errors.
- [ ] Verify audit event ordering and completeness.
- [ ] Verify redaction of nested sensitive fields.
- [ ] Verify MCP outages and model failures do not trigger remediation.
- [ ] Verify readiness during database/Temporal unavailability.
- [ ] Add graceful process shutdown tests where practical.
- [ ] Add a seed/reset script specifically for evaluator demos.
- [ ] Create a repeatable local walkthrough script or command collection.

### Required test matrix

| Requirement | Test layer |
|---|---|
| Incident creation | API integration |
| Incident validation failure | API unit/integration |
| Dependency traversal | Unit + database integration |
| Candidate ranking | Unit |
| MCP invocation | MCP integration |
| LangGraph completion | Agent graph test |
| Low-confidence path | Agent graph + end-to-end |
| Temporal approval signal | Workflow test |
| Temporal rejection signal | Workflow test |
| Activity retry | Workflow test |
| Duplicate approval | API + workflow integration |
| Remediation escalation | Workflow + end-to-end |
| Audit creation | Integration + end-to-end |
| Secret redaction | Unit + integration |
| Health/readiness | API integration |

### Acceptance gate

- All 15 mandated test scenarios are present and passing.
- The evaluator walkthrough runs from a clean seeded environment.
- No test needs a paid or live LLM.
- Failure paths end safely and remain auditable.

### Suggested commit

`test(e2e): verify complete incident attribution lifecycle`

---

## M8 — Kubernetes and Cloud Deployment

### Objective

Deploy the actual evaluated architecture and keep it reproducible from the repository.

### Tasks

- [ ] Select and document the cloud/Kubernetes target.
- [ ] Build production container images.
- [ ] Add image security and size checks where practical.
- [ ] Add Kubernetes configuration for:
  - [ ] API
  - [ ] MCP server
  - [ ] Temporal worker/LangGraph worker
  - [ ] PostgreSQL connection or deployment
  - [ ] Temporal connection or deployment
  - [ ] migrations job
- [ ] Add Services and Ingress.
- [ ] Add ConfigMaps and secret references.
- [ ] Add liveness and readiness probes.
- [ ] Add resource requests and limits.
- [ ] Configure persistent storage where self-hosted data services are used.
- [ ] Add TLS and a stable hostname.
- [ ] Configure production CORS and authentication decision.
- [ ] Deploy migrations and seed evaluator data.
- [ ] Verify public health and API documentation URLs.
- [ ] Run the full evaluator walkthrough against the hosted environment.
- [ ] Document rollback/redeploy operations.

### Acceptance gate

- The hosted API remains reachable.
- The deployed environment runs from checked-in configuration.
- Every step of the evaluator walkthrough succeeds remotely.
- Secrets are supplied outside Git and logs are redacted.
- Restarting the worker does not lose an awaiting workflow.

### Suggested commits

- `feat(deploy): add reproducible kubernetes deployment`
- `docs(deploy): document hosted environment operations`

---

## M9 — Documentation and Submission Readiness

### Objective

Make evaluation simple, reproducible, and verifiable.

### Tasks

- [ ] Complete README sections:
  - [ ] project summary
  - [ ] architecture
  - [ ] technology decisions and trade-offs
  - [ ] local setup
  - [ ] migrations and sample data
  - [ ] service startup
  - [ ] testing
  - [ ] cloud deployment
  - [ ] hosted environment
  - [ ] API examples
  - [ ] LangGraph explanation
  - [ ] Temporal explanation
  - [ ] security
  - [ ] assumptions and limitations
- [ ] Add diagrams:
  - [ ] component architecture
  - [ ] request/data flow
  - [ ] LangGraph workflow
  - [ ] Temporal workflow
- [ ] Add API documentation and working curl/Postman/Bruno examples.
- [ ] Add `docs/demo.md` with the nine-step evaluation walkthrough.
- [ ] Add evaluator access instructions without committing credentials.
- [ ] Document ranking weights, normalization, confidence, and LLM boundaries.
- [ ] Document retry, timeout, signal, query, and idempotency behavior.
- [ ] Verify CI on a clean pull request.
- [ ] Scan the repository for accidentally committed secrets.
- [ ] Verify all URLs and commands from a clean environment.
- [ ] Complete the final checklist in `PROJECT_BRIEF.md`.

### Acceptance gate

- A new evaluator can reproduce the local environment from the README.
- Hosted URLs, health endpoint, API documentation, and demo steps work.
- CI is green.
- Git history contains meaningful incremental commits.
- Every mandatory PDF requirement maps to implementation or documentation.

### Suggested commit

`docs: complete architecture deployment and evaluation guide`

---

## Optional Milestone — Product Polish

Begin this only after M9 passes.

Recommended priority:

1. Minimal React dashboard.
2. Live status updates with Server-Sent Events.
3. Incident and audit timeline.
4. Candidate score visualization.
5. OpenTelemetry tracing.
6. Prometheus metrics.
7. Helm chart.
8. Role-based approval.
9. Multi-level dependency visualization.
10. Automated cloud deployment/GitOps.

A useful UI needs only four screens or panels:

- Incident list/create form.
- Incident detail and workflow state.
- Ranked candidates, evidence, and recommendation.
- Approval controls and audit timeline.

## Suggested Two-Week Sequence

This is an aggressive sequence for focused full-time work.

| Day | Target |
|---:|---|
| 1 | M0 workspace, Compose, CI, decisions |
| 2 | M1 schema and migrations |
| 3 | M1 seeds/repositories; begin M2 traversal |
| 4 | M2 ranking and tests |
| 5 | M3 API foundation |
| 6 | M4 MCP tools and tests |
| 7 | M5 LangGraph happy path |
| 8 | M5 branches, validation, fake model |
| 9 | M6 Temporal workflow and signals |
| 10 | M6 remediation, health, idempotency |
| 11 | M7 end-to-end and failure paths |
| 12 | M8 containers and Kubernetes deployment |
| 13 | M8 hosted verification; M9 documentation |
| 14 | M9 clean-room walkthrough and final hardening |

If working part-time, keep the milestone order and expand the calendar rather than parallelizing tightly coupled components.

## Dependency Map

```text
M0 Workspace
  |
  v
M1 Database
  |
  +-------> M2 Traversal + Ranking
  |                    |
  +-------> M3 API     |
               |       |
               v       v
                M4 MCP
                   |
                   v
                M5 LangGraph
                   |
                   v
                M6 Temporal
                   |
                   v
                M7 End-to-End
                   |
                   v
                M8 Deployment
                   |
                   v
                M9 Submission
                   |
                   v
              Optional Polish
```

## Scope Control Rules

- Do not begin the UI before the API can complete the workflow locally.
- Do not call a production LLM until the fake model completes every graph branch.
- Do not deploy before local end-to-end tests pass.
- Do not add bonus infrastructure while a mandatory endpoint or test is missing.
- Do not combine workflow code with I/O; use Temporal activities.
- Do not give the agent direct database access.
- Do not execute remediation from LangGraph or an HTTP handler.
- Do not claim completion until the hosted walkthrough has been performed.

## First Development Slice

The first coding session should complete this narrow checklist:

- [ ] Initialize pnpm workspace.
- [ ] Add strict TypeScript configuration.
- [ ] Create API and shared-contract packages.
- [ ] Add Fastify `/health` endpoint.
- [ ] Add Vitest test for `/health`.
- [ ] Add lint, type-check, build, and test root scripts.
- [ ] Add `.env.example` and configuration validation.
- [ ] Add PostgreSQL and Temporal to Docker Compose.
- [ ] Add the initial CI workflow.
- [ ] Document exact local startup commands.

Once this slice is green, proceed directly to M1 rather than adding UI or cloud configuration.
