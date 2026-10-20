# Incident Lab frontend

For the all-Docker option, follow [deployment.md](deployment.md). The API image
already includes this frontend; no additional frontend container is needed.
The commands below are the host-development alternative.

With PostgreSQL and Temporal running, start the normal API and worker in
separate terminals:

```powershell
npm run dev
npm run temporal:worker
```

Open **http://127.0.0.1:3000/**. No frontend installation or separate server is
needed. Static files live in `services/web/public`; the API registers an explicit
allowlist of frontend asset routes. Existing business endpoints and workflow
implementations are unchanged.

## Demonstration

1. Click **Fill sample**, then **Create incident**. The ID is fresh and the
   detection time matches the seeded deployment data.
2. Expand candidate changes to inspect dependency distance, timing, environment,
   score factors, and change metadata.
3. Choose a simulation outcome and click **Start analysis**. This invokes the
   real configured model through the existing Temporal/LangGraph/MCP pipeline.
4. Watch confirmed MCP events and expand **Inspect the data fed to the agent**.
   Read the recorded recommendation, confidence, and evidence.
5. When awaiting approval, enter a reviewer and note, then approve or reject.
   Confirm the decision. Buttons are unavailable before a pending request exists.
6. Watch Temporal transitions, the simulated action and health check, and expand
   the audit trail. Existing incidents can be reopened from the sidebar.

## What the UI does—and does not—show

Polling uses the existing workflow, analysis, candidate, and audit APIs every
two seconds while the page is visible. It never starts workflows automatically.
Tool completion indicators and agent context come from successful MCP audit
records, not guesses based on elapsed time. HTTP candidate retrieval is separate
from the agent's MCP retrieval. The API does not stream LangGraph node progress,
model tokens, private chain-of-thought, or live activity heartbeats. A status can
remain analysing while the model or activity retries; check the worker terminal
and Temporal UI for deeper diagnostics. Fast phases may complete between polls,
but their persisted timeline remains visible.

The header checks API and database readiness. It does not claim worker readiness.
The Temporal UI link assumes the default UI port 8233; use your configured port
if different. Review identities are still caller-supplied, and all remediation
is simulated. This console is for trusted local demonstrations, not public access.

## Verification

```powershell
npm run build
npm run test:frontend
npm run test:e2e
```

Frontend tests cover asset serving, action guards, manual-investigation state,
MCP output parsing, HTML escaping, correlation-aware errors, and audit pagination.
The existing full-chain suite verifies that serving the UI does not change the
incident lifecycle. Browser-based visual/interaction verification requires an
available browser connection; these automated tests do not replace it.
