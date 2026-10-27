# Current completion and handoff — 25 October 2026

This is the current implementation checklist. `ROADMAP.md` is the historical
proposal; it is not an accurate inventory of today's tools or completion.

## Vercel update — 27 October 2026

- Provider selected: Vercel, private evaluator demo, strictly zero spending.
- Added a serverless Fastify adapter, frontend asset packaging, fail-closed shared
  demo credentials, smaller serverless database pools, and TLS/API-key Temporal
  connections for client, worker, CLI, and readiness checks.
- An optional Vercel daemon worker configuration is supplied, not enabled.
- The user reports completing the prior Docker verification. Hosted Vercel build,
  runtime, database/Temporal reachability, and the hosted lifecycle remain unverified.
- A reachable PostgreSQL database and durable authenticated Temporal endpoint
  are still required. Zero-cost external hosting has not been established.
- Follow [the Vercel deployment steps](vercel.md). The older cloud-provider choices
  below are historical; no DigitalOcean provisioning or spending is authorized.

## Completed repository work

- [x] API/frontend, Temporal lifecycle, human decisions, simulated remediation,
  PostgreSQL migrations/seeds, and incident/audit views.
- [x] Multi-stage non-root Docker image and full Compose setup. The previous
  image passed its six lifecycle scenarios; today's code/lockfile needs a new build.
- [x] Kubernetes base/demo manifests, storage, Services, secret references,
  resource constraints, migration gating, and actual readiness probe definitions.
- [x] Keyless GitHub Actions CI configuration, locked installs, action pins,
  focused/integration/image gates, and CI configuration tests.
- [x] Architecture context/container/dynamic explanations and implementation decisions.
- [x] SQL-backed saved-approval/signal-failure redelivery tests; idempotent original
  decision timestamp, conflict rejection, and no premature remediation.
- [x] Reverse MCP dependency queries, cyclic/indirect traversal, deterministic
  ranking ties, valid timestamp checks, and 600 seeded generated test cases.
- [x] Agent graph failure tests: malformed model output, retry exhaustion,
  returned/thrown MCP errors, persistence failure, and safe terminal states.
- [x] API/workflow/worker health contracts, bounded probes, pool error handling,
  surfaced tool-audit failures, correlated failure records, secret redaction,
  and atomic analysis/persistence-audit rollback.
- [x] Explicit ambiguity policy plus a small labelled synthetic attribution
  regression (not a real-model accuracy benchmark).
- [x] Non-major security dependency fixes; `npm audit` reported zero known
  vulnerabilities after updating the lockfile in this session.

## Verification performed today

Both TypeScript builds passed. The new reliability suite, HTTP-model simulation
suite, frontend, agent, ranking, model, runtime, embedded migration, CI, and
Kubernetes tests passed. Existing SQL-backed Temporal persistence and policy
tests passed separately. The reliability suite includes generated cases as
well as SQL fault injection. The real-PostgreSQL concurrency test in the embedded
migration suite remains skipped unless `TEST_DATABASE_URL` selects its disposable
test server; CI is configured to provide that server.

The actual Groq adapter/analysis node handled success, malformed output, and
repeated simulated HTTP 503s; Postman logs confirmed the HTTP calls. This does
not establish real-provider availability or complete application integration.

Updated demo manifests passed strict Kubernetes 1.34 schema validation (9/9);
CI passed actionlint syntax validation (without ShellCheck). Full Compose
configuration parsed successfully. No credentials were uploaded or paid
resources created. The Temporal workflow definition was not changed, and old
stored analyses were not rewritten by the new attribution policy.

## Still required before calling it shipped

### Your choices/access

- [ ] Choose cloud provider, region, and budget. **Reminder: DigitalOcean
  Kubernetes matches the tutorial path**; compare it with the services you find.
- [ ] Provide provider/registry access through an approved local login or secret
  store, not by putting credentials into source code or chat.
- [ ] Choose public domain/access-control expectations and whether this is a
  private evaluator demo or production-oriented deployment.
- [ ] Push reviewed changes and observe the first GitHub Actions run; optionally
  require its checks through branch protection. No commit/push/settings change
  was performed automatically.

### Remaining deployment/engineering acceptance

- [ ] Restore Docker engine responsiveness, rebuild the new lockfile/runtime,
  and rerun `test:containers`, `test:e2e`, `test:api`, and `test:temporal`.
  Those full server/process paths were not rerun today. The earlier Docker
  report is not proof of the newly changed image.
- [ ] Verify the actual worker's port-3001 readiness and graceful shutdown in
  the rebuilt image. Test real PostgreSQL/Temporal outage and recovery, not only
  injected checks. Follow up the earlier Temporal forced final stop.
- [ ] Run Kubernetes server dry-run, pod rollouts, PVC permission/restart checks,
  full hosted incident workflow, and off-host backup/restore verification.
- [ ] Configure HTTPS and authentication/authorization before publishing the
  unauthenticated console/API. Caller-supplied reviewer identities are not login.
- [ ] Choose production database/Temporal, secrets, logging/monitoring, and cost
  controls as appropriate. Development SQLite Temporal is not highly available.
- [ ] Perform the live provider/held-out incident evaluation, browser visual
  walkthrough, and record the hosted creation → analysis → decision → outcome
  → audit demonstration for submission.

These are not all tasks you must code alone: implementation can continue after
the environment and deployment choices are available. There is no automatic
approval-delivery outbox; failed signal delivery needs an identical caller retry.
Real remediation integrations, Helm, streaming, and richer telemetry remain
optional enhancements unless the assignment requires them.

## Reproduce the new checks

```powershell
npm.cmd run build
npm.cmd run build:runtime
npm.cmd run test:reliability
npm.cmd run eval:attribution
npm.cmd run test:ci
npm.cmd run test:kubernetes
```

HTTP model checks additionally require the local simulation; follow
[reliability.md](reliability.md). No live model call is part of the normal tests.

## Approval convenience without unrestricted access

Where available, select **Approve for me / Auto-review** in the desktop app's
permissions control. Enable its visibility under Settings → General → Permissions
if necessary. It keeps the workspace sandbox and routes eligible escalations to
automatic review; it does not grant arbitrary outside-folder access or promise
that all prompts disappear. Full access is not needed for this project.
No approval configuration was changed in this work.

See [official permissions guidance](https://learn.chatgpt.com/docs/permission-modes)
and [automatic review](https://learn.chatgpt.com/docs/sandboxing/auto-review).
