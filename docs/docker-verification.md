# Docker verification — 23 October 2026

The final application image built successfully and passed the isolated
compiled-container lifecycle suite. No live Groq/Gemini calls were made.

## Evidence

| Check | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run test:runtime` | 5 tests passed, including special-character credentials |
| `npm run test:model` | 6 tests passed |
| `docker build -t incidentreport-app:local .` | Exit 0 |
| Normal full-stack Compose configuration | Validated with `config --quiet` |
| Isolated Compose startup | API healthy; worker running; migrations exited 0 |
| Container seed command | 13 resources, 21 relationships, 4 changes loaded |
| `npm run test:containers` | All 6 scenarios passed; 7 TAP tests including parent |
| `npm run test:docker-temporal` | 1 restart/recovery test passed |

Image: `incidentreport-app:local`, Node `v24.22.1`, user `node`.
Image identity:
`sha256:6aad04058ae4417debfecdf4203350cdda5dcfe21bac8345e3d92d9a1011e1b0`.
The mutable Node base tag can resolve differently on future rebuilds.

The lifecycle suite exercised approval after restarting API/worker, rejection,
low-confidence escalation, no-candidate escalation, simulated remediation
failure, and unhealthy verification. It checked duplicate/conflicting
decisions, final incident state, frontend assets, and successful MCP audit
events. The image contained compiled MCP but no `.env`, source graph, or `tsx`.
The test override now leaves `DATABASE_URL` blank to exercise the same safe URL
construction used by normal Compose, rather than bypassing the entrypoint.

Postman simulation logs confirmed five successful HTTP chat-completion calls:
one per scenario except no candidates, which correctly skipped the model.
Only the external Groq response was simulated; API, worker, LangGraph, MCP,
PostgreSQL, and Temporal ran for real. The existing local stand-in was reused;
no owner-workspace mock lookup or publishing was performed for this run.

The separate Temporal test saved an approval wait, stopped its worker,
restarted only the verification Temporal server, and resumed/approved the wait.
Migration reruns reported already up to date against the existing verification
volume. This run does not establish a fresh-volume upgrade path or cloud hosting.

## Scope and operational warnings

- Normal application data and volumes were not modified by the test suites.
  All incident writes used the `manifest-verification` project.
- The verification stack is stopped after testing; its volumes and built image
  are retained. The local model simulation is stopped too.
  API/worker exited 0. Temporal's final Compose stop reported exit 137
  (SIGKILL); graceful shutdown needs follow-up. The earlier explicit Temporal
  restart/recovery test passed, but this does not establish a clean final stop.
- C: fell from approximately 4.1 GB free after Docker startup to approximately
  20 MB after rebuilding/testing. Free additional space before further runs.
  No disk-cleanup or volume deletion was performed.
- Dependency installation reported 4 advisories (1 low, 2 moderate, 1 high).
  Dependency remediation remains separate work; no automatic updates were made.
- This proves container packaging and local lifecycle behavior, not live model
  availability, browser visual QA, public deployment, or production readiness.
- The older source-mode end-to-end suite was not rerun here; its earlier
  Temporal test-executable download problem is separate from this passing
  Docker-based verification.

Reproduction commands are in [deployment.md](deployment.md). On Windows, use
`npm.cmd` instead of `npm` if PowerShell blocks `npm.ps1`; no execution-policy
change is required. This environment needed approved Docker/test execution
outside the sandbox; project file restrictions were left unchanged.
