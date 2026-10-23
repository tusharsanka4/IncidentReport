# Incident Report 🚨

Incident Report is an incident-response system that answers:

> **Something broke. What changed right before it broke?**

It collects incidents, deployments and service dependencies, ranks likely causes, asks an AI agent to review the evidence, and waits for human approval before simulating remediation.

```text
Incident
→ Candidate ranking
→ AI analysis
→ Human approval
→ Simulated remediation
```

## Features

- PostgreSQL-backed incident and change tracking
- Explainable, deterministic candidate ranking
- MCP tools for controlled data access
- LangGraph agent using Groq (with an optional Gemini provider)
- Temporal workflows with human approval
- Safe manual-investigation fallback
- Audit logging
- Simulated rollback, restart and configuration revert
- Unit and integration tests

## Tech stack

TypeScript · Node.js · Fastify · PostgreSQL · Docker · MCP · LangGraph · Groq · Temporal · Zod · node:test

## Project structure

```text
architecture/       Resource and dependency definitions
database/           Migrations and seed scripts
deploy/             Docker and deployment configuration
docs/               Project documentation
sample-data/        Example architecture and incidents
services/api/       Fastify API
services/shared/    Database, types and ranking logic
services/mcp-server/ MCP server and tools
services/agent/     LangGraph analysis agent
services/temporal-worker/ Temporal workflows
tests/              Unit and integration tests
```

## Quick start

### 1. Configure

```powershell
git clone https://github.com/tusharsanka4/IncidentReport
cd IncidentReport
Copy-Item .env.example .env
```

If `.env` already exists, keep it. Configure its PostgreSQL fields and model key:

```env
POSTGRES_USER=manifest_user
POSTGRES_PASSWORD=choose_a_private_password
POSTGRES_DB=manifest_db
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
```

### 2. Start everything in Docker

Start Docker Desktop. Stop any host API/worker or separate Temporal server first.
When reusing an existing PostgreSQL volume, keep its original credentials.

```powershell
docker compose --env-file .env -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml up -d --build --wait
docker compose --env-file .env -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml run --rm seed
```

Migrations run automatically before the API and worker start. The explicit seed
command loads reference data, not incidents. Open the frontend at
[localhost:3000](http://127.0.0.1:3000/) and create a fresh sample incident.
Check readiness:

```powershell
Invoke-RestMethod http://localhost:3000/health
Invoke-RestMethod http://localhost:3000/ready
```

### 3. Demonstrate the workflow

Create incident → inspect candidate changes → start analysis → review evidence →
approve/reject → inspect the simulated action, health check, and audit trail.
Temporal UI: [localhost:8233](http://localhost:8233).

See [Docker setup](docs/deployment.md) for logs, configuration, persistence,
isolated container tests, and the host-development alternative (`npm ci`,
migrations/seed, `npm run dev`, and `npm run temporal:worker`).

## Temporal workflow

Kubernetes deployment manifests and the private-demo runbook are available in
[deploy/kubernetes](deploy/kubernetes/README.md). Kubernetes validation uses
`npm run test:kubernetes`; see the runbook for cluster prerequisites and limits.

The Docker stack already starts persistent development Temporal and the worker.
For host development, the following CLI commands use the same lifecycle as
the frontend. Install dependencies with `npm ci` and configure the host
`DATABASE_URL` and `TEMPORAL_ADDRESS` in `.env` first. Create the incident via
the API before starting its workflow.

Start an incident workflow:

```powershell
npm run temporal:start -- INC-1042
```

Approve the simulated remediation:

```powershell
npm run temporal:decide -- INC-1042 APPROVED User "Rollback approved"
```

Or reject it:

```powershell
npm run temporal:decide -- INC-1042 REJECTED User "More investigation required"
```

## How ranking works

Candidates receive explainable scores:

```text
Direct resource match       +40
Within 15 minutes           +25
Same environment            +10
Deployment change           +10
Unrelated resource          -30
```

The configured model interprets this evidence—it does not create the ranking.

If the model fails or the evidence is weak, Incident Report safely returns:

```text
MANUAL_INVESTIGATION
```

## Tests

```powershell
npm run build
npm run test:ranking
npm run test:agent
npm run test:model
npm run test:runtime
npm run test:frontend
npm run test:e2e
```

Compiled-container verification uses `npm run test:containers` after the isolated
stack and local Postman simulation are started; see [deployment.md](docs/deployment.md).
It exercises real API/worker/LangGraph/MCP/SQL components without live model calls.

## Safety

- AI responses are schema-validated.
- Selected change IDs must exist in the supplied candidates.
- Remediation always requires human approval.
- Model failures fall back to manual investigation.
- Remediation is simulated by default.
- Important operations are audited.

## Status

The local system is containerized. Public hosting, production Temporal,
authentication, real remediation integrations, and deployment hardening remain
separate from this trusted-local demonstration setup.

---

Built to make “what broke production?” slightly less painful.
