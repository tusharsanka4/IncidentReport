# Local Docker infrastructure

This setup covers PostgreSQL and persistent **development** Temporal only.
The API, worker, and MCP process still run locally. Production containers,
authentication, Kubernetes, and step 10 end-to-end hardening are separate work.

## Start the normal stack

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
`DATABASE_URL` and `TEMPORAL_ADDRESS` to match. Inside a future container,
the addresses would use Compose service names, not `localhost`.

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
