# Continuous integration

`.github/workflows/ci.yml` runs on pushes, pull requests, and manual dispatch.
It uses Ubuntu 24.04 and Node 24, matching the application image's Node major.
This is validation only: no image publishing, Postman workspace writes, cloud
deployment, or production credentials are configured.

## Gates

| Job | Checks |
| --- | --- |
| Build and focused tests | `npm ci`, full/runtime TypeScript builds, ranking, agent, model, runtime, frontend, database migration, Kubernetes, and CI-configuration tests |
| Temporal and complete incident lifecycle | `npm ci`, real PostgreSQL migration/concurrency checks, Docker availability, Temporal/persistence tests, approval API tests, and full HTTP → Temporal → LangGraph → MCP → PostgreSQL tests |
| Build application image | Builds the Dockerfile only after both test jobs succeed; does not push the image |

Each check has its own step and preserves failures. Jobs have timeouts and newer
runs cancel obsolete runs for the same ref. Dependencies are restored from the
lockfile, not installed with a version-changing `npm install`. Only npm's cache
is reused, not `node_modules` or test database state.

The focused job also runs `test:reliability`: generated graphs/timestamps,
deterministic agent failures and attribution cases, health checks, SQL audit
rollback, and saved-approval signal redelivery. The optional `test:model-http`
suite needs the local Postman simulation and is not invoked without that setup.

Third-party actions are pinned to verified full commit SHAs. The workflow token
has only `contents: read`, checkout credentials are not persisted, and untrusted
pull-request code is not run via `pull_request_target`. No repository secrets
are referenced. Both provider-key environment values are empty.

The Kubernetes checks install kubectl 1.34.1 and verify the downloaded binary's
SHA-256 checksum before rendering manifests. This does not deploy a cluster.
The integration job uses isolated test fixtures, including a disposable
PostgreSQL Docker container. Temporal tests may download the SDK's test server;
a download failure fails the job rather than pretending the tests passed.

The integration job also starts a PostgreSQL 17 service with disposable test
credentials and runs migrations with `TEST_DATABASE_URL` pointing only at
`manifest_verification`. This exercises the concurrent migration test that the
embedded-only run intentionally skips. It never connects to an application
database. The test fixture creates/drops uniquely named databases on that
disposable CI server.

Tests use deterministic model doubles/fake HTTP responses and do not require
real Groq/Gemini keys. The full source-mode lifecycle suite replaces the model
invoke boundary; it is separate from the previously verified compiled-container
suite with the Postman HTTP stand-in. `test:containers` and
`test:docker-temporal` require their explicit Compose stacks and are not silently
invoked without them. Live model checks (`model:check`) are never part of CI.

## Enable and confirm on GitHub

Commit and push the reviewed changes normally, or open a pull request. No extra
GitHub secret is required. If repository Actions are disabled, enable them in
the repository's Actions settings. Then inspect the **IncidentReport CI** run:

1. Both test jobs must pass; inspect the individual steps and assertion output.
2. The image build must run and pass, not merely be skipped.
3. For a pull request, deliberately introduce a failing test on a temporary
   branch to confirm the gate rejects it, then revert that temporary change.
4. Configure branch protection/rulesets to require the three job checks if you
   want GitHub to prevent merging failures. Adding YAML does not enable branch
   protection automatically.

An observed green GitHub run is the final verification of the hosted runner.
Local workflow/configuration tests are not evidence that Actions already ran.
This implementation does not commit, push, dispatch runs, or change GitHub
settings automatically.

## Local checks

Implementation verification on 24 October 2026: all seven CI-configuration
tests passed; actionlint 1.7.12 accepted the workflow (ShellCheck integration
disabled because ShellCheck was unavailable); full/runtime TypeScript builds
and the ranking, agent, model, runtime, frontend, Kubernetes, and embedded
migration suites passed locally. The embedded migration run skipped its one
real-PostgreSQL concurrency case; the CI integration job explicitly enables it.
The local Docker check timed out, so the Docker/Temporal integration gates and
image build were not rerun in this session. No hosted GitHub Actions run was
triggered or observed. Local verification used Windows/Node 22, not the hosted
Ubuntu/Node 24 environment configured in the workflow.

```powershell
npm.cmd run test:ci
npm.cmd run build
npm.cmd run test:kubernetes
```

Use the individual test scripts from the workflow for focused diagnosis.
`test:e2e` needs Docker; Temporal integration tests may need network access for
their test-server executable. CI's Ubuntu environment and Node 24 still need
an actual hosted run even when local Windows/Node 22 checks pass.

References: [GitHub Node.js CI](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs),
[secure workflow practices](https://docs.github.com/en/actions/reference/security/secure-use).
