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
- LangGraph agent using Gemini
- Temporal workflows with human approval
- Safe manual-investigation fallback
- Audit logging
- Simulated rollback, restart and configuration revert
- Unit and integration tests

## Tech stack

TypeScript · Node.js · Fastify · PostgreSQL · Docker · MCP · LangGraph · Gemini · Temporal · Zod · Vitest

## Project structure

```text
architecture/       Resource and dependency definitions
database/           Migrations and seed scripts
deploy/             Docker and deployment configuration
docs/               Project documentation
sample-data/        Example architecture and incidents
services/api/       Fastify API
services/shared/    Database, types and ranking logic
services/inspector/ MCP server and tools
services/agent/     LangGraph analysis agent
services/temporal-worker/ Temporal workflows
tests/              Unit and integration tests
```

## Quick start

### 1. Install

```powershell
git clone https://github.com/tusharsanka4/IncidentReport
cd IncidentReport
npm install
Copy-Item .env.example .env
```

Configure `.env`:

```env
DATABASE_URL=postgresql://manifest_user:manifest_password@localhost:5432/manifest_db
GOOGLE_API_KEY=your_google_api_key

TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=manifest-incident-operations
```

### 2. Start PostgreSQL

```powershell
docker compose --env-file .env -f deploy/docker-compose.yml up -d
npm run seed
```

### 3. Start the API

```powershell
npm run dev
```

Check it:

```powershell
Invoke-RestMethod http://localhost:3000/health
Invoke-RestMethod http://localhost:3000/ready
```

### 4. Run the agent directly

```powershell
npm run agent -- INC-1042
```

## Temporal workflow

Start the local Temporal server:

```powershell
docker run --rm -it `
  --name manifest-temporal `
  -p 7233:7233 `
  -p 8233:8233 `
  temporalio/temporal:latest `
  server start-dev `
  --ip 0.0.0.0
```

Open the UI at [localhost:8233](http://localhost:8233).

In another terminal, start the worker:

```powershell
npm run temporal:worker
```

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

Gemini interprets this evidence—it does not create the ranking.

If the model fails or the evidence is weak, Incident Report safely returns:

```text
MANUAL_INVESTIGATION
```

## Tests

```powershell
npm run build
npm run test:ranking
npm run test:agent
```

## Safety

- AI responses are schema-validated.
- Selected change IDs must exist in the supplied candidates.
- Remediation always requires human approval.
- Model failures fall back to manual investigation.
- Remediation is simulated by default.
- Important operations are audited.

## Status

The core system is complete. Current work focuses on deployment, real application integrations, CI and final shipment preparation.

---

Built to make “what broke production?” slightly less painful.