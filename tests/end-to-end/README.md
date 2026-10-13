# Full-chain end-to-end tests (step 10)

Run from the project root with Docker Desktop running:

```powershell
npm run build
npm run test:e2e
```

No running API, worker, development database, or Temporal service is needed.
Your existing services can remain running: all test ports are allocated
automatically. No valid Google API key or paid model calls are required.
The first run may download the PostgreSQL image or Temporal SDK test server.

## What runs for real

- HTTP requests over a loopback TCP connection to the real Fastify application.
- A real isolated Temporal server, production workflow, and all production activities.
- The actual LangGraph graph, nodes, routing, and persistence path.
- The actual MCP server launched as a separate stdio subprocess by the agent.
- PostgreSQL 17 in a generated Docker container, with real migrations and seeds.

The **only replaced application boundary** is `analysisModel.invoke`. A
test-only fake parses the real prompt, chooses the highest-ranked supplied
deployment, derives rollback versions from its metadata, and validates its
output against the production model schema. It is not an environment mode
that could accidentally enable simulated analysis in production.

## Coverage

| Scenario | Expected result |
| --- | --- |
| Human approval | One rollback simulation, healthy verification, `RESOLVED` |
| Human rejection | `REJECTED`, no remediation |
| Low model confidence | Manual-investigation recommendation, `ESCALATED`, no approval or remediation |
| No recent candidate changes | Model bypassed, manual investigation, `ESCALATED` |
| Simulated remediation failure | `ESCALATED`, no health verification |
| Simulated unhealthy verification | `ESCALATED`, degraded health stored |

Tests also verify duplicate starts/decisions, conflicting decisions, no
remediation before approval, candidate parity between HTTP and MCP, persisted
analysis, final incident status, exactly-once remediation records, chronological
audit events, lifecycle timeline parity, and successful MCP tool audits.
Checking MCP audit records prevents a direct tool-function shortcut from
silently replacing the subprocess/protocol integration.

## Isolation and cleanup

The fixture creates `manifest-e2e-<pid>-<timestamp>` with an identifying label,
an ephemeral host port, test-only credentials, and tmpfs database storage.
It never uses application Compose volumes or the `.env` database URL.
Environment settings are assigned before importing application modules and
before the MCP subprocess is configured. Cleanup closes HTTP, MCP, database,
and Temporal connections and removes only the label-verified test container.

If the process is forcibly killed before cleanup, inspect Docker Desktop for
the generated `manifest-e2e-*` container and remove that specific test container.
Do not remove normal application containers or volumes.

## Scope boundary

This completes the checklist's full-flow testing task, not every shipping
requirement. Model/MCP/database outage campaigns, production packaging,
readiness/shutdown hardening, authentication, CI, and hosted verification remain
separate tasks. The smaller API, workflow, migration, and unit suites remain useful
for focused failures; this suite complements rather than replaces them.
