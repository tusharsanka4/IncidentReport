# IncidentReport model simulation

Existing local mock reused; upstream contract: `postman/contracts/groq-chat.yaml`.

## Purpose

Simulates Groq only. Handler and failure markers live in
`postman/mocks/groq/default.js`; application/Temporal/SQL are not members.

## Execution

Start `postman simulation run postman/simulations/containers.sim.yaml --port 4900 --output ndjson --no-history`.
Confirm its listening event; use its bound address. Run `npm.cmd run test:model-http`
for adapter/node checks, or follow `docs/deployment.md` for the isolated Docker
lifecycle. Stop only this simulation with Ctrl+C.

## Assumptions

- `GROQ_BASE_URL` is an origin plus `/groq`, not `/openai/v1`; LangChain adds
  the latter. Wrong bases returned 501 in earlier runs. (observed 2026-10-20)
- Docker Desktop reached the host listener through `host.docker.internal`;
  native Linux networking needs separate verification. (observed 2026-10-23)
- The stand-in models response shape and deterministic faults, not Groq's
  actual decision quality or quota policy. No account/workspace lookup was
  performed for this existing local mock. (reasoned 2026-10-25, handler)

## Observations

<!-- begin:observations -->
2026-10-25: Groq served success and deterministic HTTP failures/malformed-output
cases; the adapter/node suite passed. This run used no MCP/SQL/Temporal and does
not replace the earlier Docker lifecycle verification.
2026-10-23: Groq served each model-using lifecycle scenario; no-candidate analysis
correctly made no HTTP request. Docker lifecycle passed; see docs/docker-verification.md.
<!-- end:observations -->
