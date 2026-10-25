# Reliability and attribution checks

## Implemented improvements

| Tutorial item | Implementation and evidence |
| --- | --- |
| Architecture | Container-level and dynamic diagrams in `architecture/README.md` |
| Approval delivery gap | SQL-backed test commits approval, fails signal delivery, retries the identical decision, preserves its timestamp, rejects conflict, and checks one audit/no premature action |
| Dependency cycles/reverse queries | MCP `get_resource_dependencies` accepts `direction: dependencies` (default) or `dependents`; shortest paths, depth bounds, unique nodes, cyclic termination tested |
| Agent failures | Injectable graph dependencies; schema validation at node boundary; model failure/invalid output exhaust exactly three attempts before recorded manual investigation; MCP load/write failure cannot become approval-ready |
| Property/edge cases | fast-check: 300 cyclic graphs against a Floyd–Warshall oracle plus 300 timestamp/candidate lists; bounded scores, deterministic ties, input preservation, time boundaries |
| Health/audits | Separate liveness/readiness; worker poll state and database/Temporal checks; thrown/returned MCP failures, redaction, surfaced audit-write failure, atomic analysis/audit rollback |
| Attribution evaluation | Six labelled synthetic cases exercise clear cause, ties, near ties, conflicting environment, weak evidence, and no changes |

## Approval saved, signal failed

The approval endpoint first commits the human decision and audit in PostgreSQL,
then sends the Temporal signal. A delivery error does not mean that database
commit was rolled back. Retry **the same endpoint/body, reviewer, comment, and
workflow**. The repository reuses the original stored decision timestamp and
signal delivery is safe to repeat. A conflicting decision is rejected.

The new test uses real embedded PostgreSQL SQL and an injected signal boundary;
it does not claim to restart a real Temporal worker. Earlier Docker restart
tests cover worker/server recovery separately. No background outbox automatically
rescues an abandoned HTTP request: the caller still needs to retry delivery.

## Attribution is not model confidence

Current conservative policy is in `services/agent/src/attribution-policy.ts`:

- Consider related resources in the incident's environment, with a real timestamp
  at/before detection and within the graph's six-hour evidence window.
- Require a raw ranking score of at least 40 and a lead of at least 10 over the
  next eligible candidate. Ties/near ties cause manual investigation before any
  model call. Missing/malformed support fields also fail closed.
- The model may recommend manual investigation. Otherwise its selected change
  must match the policy-supported candidate. Existing confidence/action/human
  approval safeguards still apply after schema validation.

These thresholds are explicit heuristics, not calibrated incident probabilities.
Do not tune them using only the small regression fixture. Add representative,
held-out incidents and review false attribution/abstention before production.

```powershell
npm.cmd run test:reliability
npm.cmd run eval:attribution
```

The synthetic regression expects 1 supported attribution and 5 appropriate
manual investigations (6/6 expected outcomes). Its deterministic model double
does **not** measure Groq/Gemini accuracy. It reports a policy/graph regression
metric, not a live-model benchmark or a confidence calibration result.

## Health contracts

| Endpoint | Healthy response | Failure response |
| --- | --- | --- |
| API `GET /health` | 200: process responds | Does not query dependencies |
| API `GET /ready` | 200: database connected | 503: database disconnected |
| API `GET /ready/workflow` | 200: database and Temporal gRPC reachable | 503: unavailable dependency named, without internal error details |
| Worker `GET :3001/health` | 200: HTTP process responds | Does not query dependencies |
| Worker `GET :3001/ready` | 200: RUNNING, both SDK pollers POLLING, database and Temporal reachable | 503: not ready |

Compose and Kubernetes use the workflow/worker readiness checks. Liveness
remains dependency-free to avoid outage-driven restart loops. Pool connection
and query timeouts bound database operations; the readiness query has a shorter
per-query timeout. Temporal health uses a bounded gRPC capability call, not an
open port as proof. Worker port can be changed with `WORKER_HEALTH_PORT`, but
probe configuration must be updated with it. It is not publicly exposed.

Readiness does not prove model availability, successful task execution, or
instantaneous outage detection. Tests inject dependency failures and exercise
real HTTP worker responses. They are not a live cluster/database outage campaign.

## Auditing and retries

MCP wrappers record thrown and returned failures and preserve incident correlation
when that incident exists. Missing incidents produce null correlation rather
than a foreign-key error. Audit-write failures return `AUDIT_WRITE_FAILED`,
never a silently unaudited success. The operation may already have completed;
retry with the original workflow ID. Analysis recording includes a separate
mandatory audit in the same transaction, so that audit's failure rolls back both
the new analysis and the incident status update. Lifecycle writes already use
transactional audits. Older stored analyses are not retroactively rewritten.

Nested sensitive keys, JSON text, bearer tokens, credential URLs, and common
inline secret assignments are redacted. This is defense in depth, not a guarantee
that arbitrary prose cannot contain sensitive data. Keep logs private. No system
can persist a failure audit to an unavailable database; that condition is surfaced
and needs external monitoring/log retention.

## HTTP model verification (no live quota)

In one terminal:

```powershell
postman simulation run postman/simulations/containers.sim.yaml --port 4900 --output ndjson --no-history
```

In another:

```powershell
npm.cmd run test:model-http
```

This runs the actual Groq HTTP adapter and analysis node against success,
malformed output, and repeated 503 responses. It checks bounded failure/fallback,
not real Groq availability. It does not run MCP, SQL, or Temporal. The mock only
stands in for the external model; see `postman/simulations/containers.context.md`.
CI runs the offline reliability regression; this explicit HTTP suite additionally
requires the simulation. No real key is used.
