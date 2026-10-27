# Vercel deployment

## What this deployment runs

`vercel.json` deploys `api/index.ts` as one Node.js function. All browser and API
paths reach the existing Fastify application, including its bundled frontend.
The function reuses its app and database pool across warm requests. It does not
listen on a port, run migrations, launch MCP, or run background workflows.

The existing Temporal worker still runs LangGraph, Groq, and the MCP subprocess.
It can run on your laptop or, optionally, as a Vercel daemon. Both API and worker
must use the **same PostgreSQL database, Temporal namespace, and task queue**.

Vercel does not provision PostgreSQL or the Temporal server through this config.
Its functions cannot reach your laptop's `localhost`, Docker service names, or a
Tailscale-only address. A Vercel daemon also needs an external durable Temporal
server; running the SQLite development server on ephemeral storage would lose
workflow history.

## Zero-spending boundary

Use a personal **Hobby** account and the included `vercel.app` domain. Do not
upgrade plans or enable paid database/Temporal integrations. Free quotas can
interrupt service; they are not unlimited compute. Groq remains subject to its
own free quotas.

**The full stack is not yet established as a zero-cost cloud deployment.** You
still need a reachable PostgreSQL service and authenticated, TLS-enabled Temporal
endpoint with persistent history. Existing laptop Docker endpoints are not a
substitute for those endpoints. No free Temporal hosting has been provisioned or
verified here. Do not start a card-backed trial to complete these instructions.
You can deploy the protected console/API first, but analysis cannot finish until
the database, Temporal server, and worker are connected.

## 1. Prepare dependencies

Obtain the endpoints above only under terms that guarantee no charges. For the
database, use the provider's pooled PostgreSQL URL and its required TLS settings
(usually supplied in the URL). Never disable certificate validation. Run the
existing migrations and reference-data seed from your laptop against that database:

```powershell
npm ci
$env:DATABASE_URL = 'your-private-remote-postgresql-url'
npm run migrate
npm run seed
```

Do not commit this URL. These commands change the selected database; verify the
target first. Use a dedicated demo database, not production data. If the provider
requires a direct URL for migrations, use that for these commands, then its
pooled URL in Vercel and the worker.

## 2. Import the repository

1. Commit and push the changes to your GitHub repository yourself.
2. Sign into Vercel on **Hobby** and choose **Add New > Project**.
3. Import `IncidentReport`; keep **Root Directory** at the repository root.
4. Select **Other** as the framework. Use Node.js **24.x**.
5. Keep the checked-in settings: install `npm ci`, build `npm run build:runtime`,
   output directory `public`. This directory is deliberately empty: Fastify serves
   the private frontend rather than publishing unprotected static files.

Do not select the Dockerfile or deploy the `services/web` directory by itself.

## 3. Configure server environment variables

Set these in Vercel **Settings > Environment Variables** for Production. Configure
Preview too if using it, preferably with a separate database, namespace, and queue.
The access gate fails closed when Vercel credentials are missing.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Remote pooled PostgreSQL URL, including provider TLS settings |
| `TEMPORAL_ADDRESS` | Reachable TLS gRPC endpoint, `hostname:port`, without `https://` |
| `TEMPORAL_NAMESPACE` | Exact remote namespace |
| `TEMPORAL_TASK_QUEUE` | `manifest-incident-operations`, matching the worker |
| `TEMPORAL_TLS` | `true` |
| `TEMPORAL_API_KEY` | Remote Temporal API key, if required by the service |
| `DEMO_USERNAME` | Shared demo login; avoid `:` in the username |
| `DEMO_PASSWORD` | Unique random password, at least 20 characters |

Vercel supplies `VERCEL=1`. The access gate covers the page, assets, API, and health
routes. Missing or short credentials produce HTTP 503; incorrect credentials
produce HTTP 401 with a browser login prompt. Keep both variables server-only.
The connection helper supports public-CA TLS and optional API-key authentication;
custom CAs and mutual-TLS certificates are not configured by this helper.

Do not upload `.env` or put any secrets in `services/web/public`. The model key is
needed only by the worker, not by the HTTP function.

## 4. Start a worker

The simplest initial option is the existing worker on your laptop, with the same
remote database and Temporal settings above plus `LLM_PROVIDER=groq`, `GROQ_API_KEY`,
and `GROQ_MODEL`. In that terminal, run:

```powershell
npm run temporal:worker
```

Keep that terminal and laptop running during evaluation. Do not point this worker
at the old local database while the hosted API uses a remote one.

Vercel also offers **Daemons in public beta**, including on Hobby within quotas.
If your account exposes this feature and its free limits are adequate, copy the
object from `deploy/vercel-worker.example.json` into a top-level `daemons` key in
`vercel.json`. It uses the existing root Dockerfile and overrides the command to
run the compiled worker. Add the model variables to Production first and redeploy.
The example is optional and **not enabled by default**; actual daemon rollout and
resource fit have not been verified in Vercel. Daemons currently run in production
only. Run one worker for the demo, and inspect its logs for `RUNNING` and the exact
task queue. Stop the laptop worker if it uses a different model configuration.

Do not add PostgreSQL or the development Temporal server as daemons: their storage
must survive instance replacement. No automatic switch to Vercel Workflows is
performed; the project's Temporal behavior is preserved.

## 5. Deploy and verify privately

1. Click **Deploy**. After environment-variable changes, redeploy so they apply.
2. Open the production `https://...vercel.app` URL. Enter the shared demo credentials
   when prompted. Share the credentials privately with the evaluator.
3. Check `/health`, then `/ready`, then `/ready/workflow` in that browser. The latter
   checks database and Temporal connectivity, not whether a worker is polling.
4. Create a sample incident, inspect candidate changes, start analysis, wait for
   approval, approve or reject, and inspect the final status and audit trail.
5. Restart the worker during an approval wait and confirm the workflow resumes
   after approval. Keep the existing local verification evidence as well.
6. In a private browser window, verify the root and an API URL require credentials.
   Confirm an unauthenticated POST is rejected too. Vercel Deployment Protection
   can provide an additional layer, but its sharing settings must allow your evaluator.

This is a shared-password demo gate, not individual user accounts. The existing
approval form's `decided_by` remains caller-supplied; it is not an authenticated
per-person identity. Use only demo data. HTTPS is required for Basic authentication.

## Troubleshooting and shutdown

- **503 private access not configured:** set both demo credentials and redeploy.
- **503 readiness / connection refused:** check external endpoints and network
  reachability. `localhost`, `postgres`, and `temporal` are not cloud addresses.
- **Workflow remains analysing:** inspect worker logs, model quota, namespace,
  task queue, and database consistency; do not repeatedly launch new workflows.
- **Build fails:** run `npm run build:runtime`, `npm run build`, and
  `npm run test:vercel` locally. Never add live migrations to the build command.
- To withdraw access, rotate the password and redeploy, then remove the Vercel
  project when finished. Disable any daemon instance overrides in the dashboard
  as well. Retain or delete external data deliberately under its provider's terms.

## Reference documentation

- [Node.js functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [Hobby limits](https://vercel.com/docs/plans/hobby)
- [Daemons](https://vercel.com/docs/daemons)
- [Daemon configuration](https://vercel.com/docs/daemons/config-reference)
- [Temporal TypeScript connections](https://docs.temporal.io/develop/typescript/client/temporal-client)
