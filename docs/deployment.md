# Docker setup

The full stack runs the API/frontend, Temporal worker, compiled MCP subprocess,
PostgreSQL, and persistent **development** Temporal in Docker. Migrations run
before the application starts. Kubernetes and cloud hosting are not included.

## Run the complete application

Start Docker Desktop. Copy `.env.example` to `.env` only if you do not already
have one. Set the PostgreSQL fields and your chosen model key (`GROQ_API_KEY`
by default). Never overwrite an existing `.env` containing secrets.

Stop host-side `npm run dev`, `npm run temporal:worker`, and any manually
started Temporal server first. This avoids port conflicts and a second worker
polling the same queue. Keep existing database credentials when reusing volumes.

```powershell
docker compose --env-file .env -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml up -d --build --wait
docker compose --env-file .env -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml run --rm seed
```

Seeding is explicit: it loads reference resources, relationships, and changes,
not incidents. It is not automatically run against an existing database.
Open the frontend at `http://127.0.0.1:3000/` and Temporal UI at
`http://127.0.0.1:8233/`. Create a fresh incident to exercise the workflow.

```powershell
Invoke-RestMethod http://127.0.0.1:3000/ready
docker compose --env-file .env -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml ps -a
docker compose --env-file .env -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml logs --tail 50 api worker migrate
```

`migrate` exiting with code 0 is expected. API readiness checks PostgreSQL;
it does not prove the worker is polling. Check the worker's `RUNNING` log and
complete an incident flow. The worker has no separate readiness endpoint yet.

### Image and configuration

One multi-stage Node 24 Debian image serves the API, worker, migration, and seed
commands. It runs as the non-root `node` user with production dependencies,
compiled JavaScript, frontend assets, migration SQL, and sample data. The worker
launches the compiled MCP server using Node, without `tsx` or source TypeScript.
Host development still uses the original TypeScript commands.

`.dockerignore` excludes `.env`, dependencies, Git data, and test artifacts.
Secrets are supplied at runtime, not during the image build. Only the worker
receives model keys. Environment variables are still visible to Docker operators;
use a managed secret store when deploying publicly.

Inside Docker, the database is `postgres:5432` and Temporal is `temporal:7233`.
The entrypoint safely constructs the database URL from the PostgreSQL fields,
including URL-encoding credentials. `DATABASE_URL` and `TEMPORAL_ADDRESS` in
`.env` remain host-development settings. Optional `CONTAINER_DATABASE_URL`
overrides the container database connection; it must be reachable from Docker.
This does not remove the local PostgreSQL service automatically.

`API_PORT` changes the published API port, not its internal port 3000. Existing
infrastructure port settings still apply. After changing worker keys/settings,
run the full `up -d --build --wait` command again; `restart` alone does not
reload changed environment variables.

```powershell
docker compose --env-file .env -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml stop
```

Always use both files when managing the full application. Ordinary `down` also
preserves named volumes. Never add `-v` unless intentionally deleting all data.

## Host-development alternative

Copy the required settings from `.env.example` into your existing `.env` without
overwriting secrets. Defaults connect host-side applications to PostgreSQL at
`localhost:5432` and Temporal at `localhost:7233`.

Stop any Windows Temporal CLI server already using port 7233. The Docker server
has its own history; it does not import `.temporal/temporal.db` automatically.
Finish pending workflows on the old server before switching, and use fresh
incident IDs on the new one.

```powershell
docker compose --env-file .env -f deploy/docker-compose.yml up -d --wait
npm run migrate
npm run seed
```

Then run `npm run temporal:worker` and `npm run dev` in separate terminals.
Temporal UI: `http://localhost:8233`.

Both services publish ports only on loopback. Configurable host ports are
`POSTGRES_PORT`, `TEMPORAL_PORT`, and `TEMPORAL_UI_PORT`. If changed, update
`DATABASE_URL` and `TEMPORAL_ADDRESS` to match. The application-container
override already uses the Compose service names for internal connections.

## Persistence and restart

The existing `postgres-data` volume and Compose project identity are unchanged.
Temporal runs the pinned `temporalio/temporal:1.9.1` image with a database file in
`temporal-data`, mounted at the image's non-root user's home directory.
PostgreSQL stores incident data; Temporal stores execution history. Both are
needed to recover a pending incident workflow.

```powershell
docker compose --env-file .env -f deploy/docker-compose.yml ps
docker compose --env-file .env -f deploy/docker-compose.yml logs --tail 50 temporal
docker compose --env-file .env -f deploy/docker-compose.yml restart temporal
docker compose --env-file .env -f deploy/docker-compose.yml stop
```

Restart or ordinary `down` preserves named volumes. **Do not use `down -v`**:
that deletes persistent database and workflow history. Before changing Temporal
versions, back up its volume and test compatibility on a copy. Restart testing
is not a substitute for an off-host backup and restore plan.

The health check calls `temporal operator cluster health`. The namespace defaults
to `default`; set `TEMPORAL_NAMESPACE` consistently for server, API, and worker.
This CLI server is intended for development, not a secured, highly available
production cluster. See the [official local-server documentation](https://github.com/temporalio/documentation/blob/main/docs/cli/setup-cli.mdx).

## Isolated verification stack

This uses separate project-scoped volumes, container names, and ports, so it
can run beside the normal PostgreSQL container and Windows Temporal server.
The override requires Compose 2.24.4 or newer for `!override`.

```powershell
docker compose --env-file .env --project-name manifest-verification -f deploy/docker-compose.yml -f deploy/docker-compose.verify.yml up -d --wait
npm run test:docker-temporal
```

The test verifies the container's project label, runs an approval-wait workflow,
stops its worker, restarts **only** `manifest-verify-temporal`, recreates the
worker, queries the recovered wait, and approves it to completion. It does not
run the full incident pipeline or mutate the normal Temporal server.

PostgreSQL verification instructions are in
[database migrations](../database/migrations/README.md).

Stop and remove the verification containers and network after testing, retaining
their volumes:

```powershell
docker compose --env-file .env --project-name manifest-verification -f deploy/docker-compose.yml -f deploy/docker-compose.verify.yml down
```

## Complete compiled-container verification

This separate recipe tests the real compiled API, worker, LangGraph, stdio MCP,
PostgreSQL, and Temporal. Only Groq's HTTP response is simulated by a local
Postman stand-in. It uses a fake key and consumes no live model quota. The
stand-in is a narrow test contract, not a replacement production API.

Requires Node dependencies (`npm ci`), the Postman CLI, Docker Desktop, and free
ports 4900, 13000, 15432, 17233, and 18233. The host simulation connection was
verified with Docker Desktop; native Linux Docker host networking may need a
different reachable host address. Do not run the earlier infrastructure-only
verification test concurrently: it uses the same isolated project.

Start this in a separate terminal (leave it running):

```powershell
postman simulation run postman/simulations/containers.sim.yaml --port 4900 --output ndjson --no-history
```

Then:

```powershell
docker compose --env-file .env --project-name manifest-verification -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml -f deploy/docker-compose.verify.yml -f deploy/docker-compose.container-test.yml up -d --build --wait
docker compose --env-file .env --project-name manifest-verification -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml -f deploy/docker-compose.verify.yml -f deploy/docker-compose.container-test.yml run --rm seed
npm run test:containers
```

The suite checks non-root execution, absence of source/`tsx`/`.env` in the image,
frontend assets, approval after API/worker restart, rejection, low confidence,
no candidates, remediation failure, unhealthy verification, duplicate decisions,
and successful real MCP audit events. The simulation prints actual model HTTP
requests; no-candidate analysis should not call it. Test incidents remain only
in the verification database. No Postman workspace login or publishing is needed.

Stop the simulation with Ctrl+C. Remove only the verification containers and
network, retaining their volumes:

```powershell
docker compose --env-file .env --project-name manifest-verification -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml -f deploy/docker-compose.verify.yml -f deploy/docker-compose.container-test.yml down
```

## Before public deployment

These containers are a packaging milestone, not a production certification.
The Temporal dev server, trusted-local unauthenticated console, simulated
remediation, worker readiness, secrets, dependency advisories, TLS, backups,
monitoring, and cloud/Kubernetes deployment still need production decisions.
