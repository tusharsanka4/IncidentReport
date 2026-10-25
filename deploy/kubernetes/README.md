# Kubernetes demonstration deployment

This packages the existing application for Kubernetes without changing the
incident workflow or API contract. It is a **private learning/demo setup**, not
a production cloud architecture. Nothing here provisions a cloud cluster.

## What runs where

| Resource | Responsibility |
| --- | --- |
| `incidentreport-api` Deployment + Service | API and existing frontend |
| `incidentreport-worker` Deployment | Temporal activities and LangGraph; launches compiled MCP as a subprocess |
| Migration init container in each app pod | Applies pending migrations before the app starts |
| `postgres` StatefulSet + headless Service | Incident, analysis, approval, and audit data on a 2 GiB PVC |
| `temporal` StatefulSet + headless Service | Single development server; execution history on a separate 1 GiB PVC |
| ConfigMap | Non-secret runtime settings |
| Referenced Secret | Database password/optional connection URI and chosen provider key |
| Opt-in seed Job | Loads reference data, not incidents |

The migration runner's transaction and advisory lock serialize concurrent init
containers. A failed migration prevents that pod's main container from starting.
Init containers retry if PostgreSQL is not ready yet. They do not import data
from Docker Compose volumes. Worker startup may restart until Temporal is ready.

`base/` contains application resources only. `overlays/demo/` adds PostgreSQL
and development Temporal. Use the demo overlay for a self-contained local run.
The base requires reachable database/Temporal services and configured secrets;
it is a starting point for a future cloud overlay, not a ready cloud deployment.

## Prerequisites

- A running Kubernetes cluster and `kubectl`; a client alone is not a cluster.
- A default dynamic StorageClass able to provision ReadWriteOnce volumes.
  Otherwise choose `storageClassName` in both claim templates before deployment.
- Enough RAM/CPU/storage for Kubernetes plus the workloads. PVC requests alone
  total 3 GiB; image/build caches and the cluster use additional disk space.
- The built application image available to the cluster and a real chosen model
  key for an actual AI demonstration. Deterministic verification can instead use
  a reachable HTTP model simulation; do not confuse it with live inference.
- A trusted local environment. No auth, TLS, public Ingress, or LoadBalancer
  is configured. Do not publish this console directly to the Internet.

For a local cluster, Docker Desktop Kubernetes or
[kind](https://kind.sigs.k8s.io/docs/user/quick-start/) are options. Enabling
Docker Desktop Kubernetes downloads more images and changes local infrastructure;
do that explicitly rather than assuming Compose already provides a cluster.
With kind, use a dedicated cluster and load the existing image:

```powershell
kind create cluster --name incidentreport --wait 180s
kind load docker-image incidentreport-app:local --name incidentreport
```

These commands are alternatives to an existing cluster, not required for all
providers. Do not create a paid cluster until choosing the cloud deployment plan.

## 1. Check the target and image

Run commands from the repository root. Set the exact context you intend to use:

```powershell
kubectl config get-contexts
$kubeContext = 'kind-incidentreport' # Replace for your cluster.
kubectl --context $kubeContext cluster-info
kubectl --context $kubeContext get storageclass
```

The examples use `incidentreport-app:local` and `IfNotPresent`. On a remote
cluster, publish a versioned image to a registry first and set `newName` and
`newTag` under `images` in **both** `base/kustomization.yaml` and
`jobs/kustomization.yaml`. Configure `imagePullSecrets` if the registry is
private. A local Docker image is not automatically present on remote nodes.
Never use a mutable tag to roll out code changes; use a new version/digest.

## 2. Create secrets privately

Copy the Kubernetes example only if the destination does not already exist:

```powershell
Copy-Item deploy/kubernetes/.env.example deploy/kubernetes/.env
```

Edit `deploy/kubernetes/.env` locally. Set `POSTGRES_PASSWORD` and the selected
model key (`GROQ_API_KEY` by default). Keep `DATABASE_URL` blank for internal
PostgreSQL; the existing entrypoint constructs and encodes the connection URL.
The API and migration containers receive database secrets only. The worker
additionally receives optional Groq/Gemini keys.

The file is ignored by Git. Do not paste credentials into YAML or command-line
literal arguments. Kubernetes Secrets are not encrypted merely by base64
encoding: restrict RBAC and use encryption/managed secrets for a real deployment.
Keep database credentials unchanged when reusing a PVC; changing the Secret
does not rotate an existing PostgreSQL user's password.

```powershell
kubectl --context $kubeContext apply -f deploy/kubernetes/base/namespace.yaml
kubectl --context $kubeContext -n incidentreport create secret generic incidentreport-secrets --from-env-file=deploy/kubernetes/.env
```

`create` deliberately fails if the Secret already exists. For later updates,
edit the private file and use the following local pipeline, then restart app
Deployments so their environment values refresh:

```powershell
kubectl --context $kubeContext -n incidentreport create secret generic incidentreport-secrets --from-env-file=deploy/kubernetes/.env --dry-run=client -o yaml | kubectl --context $kubeContext apply -f -
kubectl --context $kubeContext -n incidentreport rollout restart deployment/incidentreport-api deployment/incidentreport-worker
```

## 3. Validate and apply

```powershell
npm.cmd run test:kubernetes
kubectl kustomize deploy/kubernetes/overlays/demo
kubectl --context $kubeContext apply --dry-run=server -k deploy/kubernetes/overlays/demo
kubectl --context $kubeContext apply -k deploy/kubernetes/overlays/demo
kubectl --context $kubeContext -n incidentreport rollout status statefulset/postgres --timeout=300s
kubectl --context $kubeContext -n incidentreport rollout status statefulset/temporal --timeout=300s
kubectl --context $kubeContext -n incidentreport rollout status deployment/incidentreport-api --timeout=300s
kubectl --context $kubeContext -n incidentreport rollout status deployment/incidentreport-worker --timeout=300s
kubectl --context $kubeContext -n incidentreport get pods,services,pvc
```

Check each command succeeds before continuing. Applying all resources together
is safe for initial startup: migrations gate the applications, while Kubernetes
retries unavailable dependencies. Do not apply the opt-in seed Job until the
API's migration init container has completed successfully.

## 4. Seed explicitly, then open the demonstration

```powershell
kubectl --context $kubeContext apply -k deploy/kubernetes/jobs
kubectl --context $kubeContext -n incidentreport wait --for=condition=complete job/incidentreport-seed --timeout=300s
kubectl --context $kubeContext -n incidentreport logs job/incidentreport-seed
kubectl --context $kubeContext -n incidentreport port-forward service/incidentreport-api 13000:3000 --address 127.0.0.1
```

Leave port-forward running; open `http://127.0.0.1:13000/`. In another terminal,
forward Temporal UI separately (set `$kubeContext` there too):

```powershell
kubectl --context $kubeContext -n incidentreport port-forward service/temporal 18233:8233 --address 127.0.0.1
```

Open `http://127.0.0.1:18233/` manually; the frontend's existing Temporal link
still assumes port 8233. Port-forwarding is local and ends when the command
stops. If a pod is replaced, restart its port-forward command.

Follow the existing six-step frontend demonstration: create a fresh incident,
inspect changes, start analysis, review evidence, approve/reject, and confirm
the final state/audit trail. This is the runtime acceptance check, not just
`rollout status`. To rerun a completed seed Job deliberately, delete **only**
`job/incidentreport-seed`, then reapply `jobs/`; completed Job specs are immutable.

## Probes, shutdown, and diagnostics

API startup/liveness use `/health` (no dependency checks). Readiness uses
`/ready/workflow` (PostgreSQL + Temporal). The original `/ready` stays database-only. PostgreSQL
and Temporal have startup/readiness checks. Neither gains a dependency-based
liveness probe that would restart it repeatedly during an outage.

The worker now exposes an internal health server on port 3001. `/health` is
process-only; `/ready` checks SDK run/poller state, PostgreSQL, and bounded
Temporal gRPC health. Kubernetes probes use those separate paths. This is not
proof that a task/model call will succeed; verify an actual incident workflow.

All containers have resource requests/limits, non-root IDs, dropped Linux
capabilities, no privilege escalation, a read-only root filesystem, and no
mounted service-account token. Writable paths use PVCs or bounded `emptyDir`
volumes. The worker has a writable `/tmp` for its bundle/runtime needs. These
settings still need a live-cluster check with the chosen images/storage driver.

API shutdown grace is 30 seconds; worker and Temporal get 90 seconds. No core
workflow changes or automatic real remediation were introduced. Never scale
the single SQLite Temporal server or PostgreSQL above one replica. API/worker
scaling requires capacity/model-quota planning, not scaling their state stores.

```powershell
kubectl --context $kubeContext -n incidentreport logs deployment/incidentreport-api -c migrate
kubectl --context $kubeContext -n incidentreport logs deployment/incidentreport-worker -c worker --tail=80
kubectl --context $kubeContext -n incidentreport describe pod <pod-name>
kubectl --context $kubeContext -n incidentreport get events --sort-by=.metadata.creationTimestamp
```

`Pending` PVCs usually mean storage provisioning needs attention.
`ImagePullBackOff` means image naming/registry access/loading needs attention.
`CreateContainerConfigError` can mean a missing Secret/key. Init-container
failures need migration logs, not a forced rollout. Review logs privately:
configuration and upstream error details can contain sensitive information.

For updates, migrations must remain compatible with both old and new pods
during rolling updates. Back up data and review SQL before deploying; there is
no automatic schema rollback. Application updates must use a tested image tag
shared by the init and main containers. Restart Deployments after ConfigMap
changes, too: environment values are captured when each pod starts.

## Persistence and stopping

To pause the demo without deleting persistent storage, scale its Deployments
and StatefulSets to zero (after finishing pending demonstrations). Restore each
to one to resume. Do not delete the namespace, PVCs, or kind cluster if you need
the data. StatefulSet pod replacement preserves the claims, but namespace or
cluster deletion can delete the data according to the storage reclaim policy.
PVCs are not backups. PostgreSQL and Temporal both require recovery planning.

## Verification and limits

Implementation checks completed on 23 October 2026:

- TypeScript build passed.
- All 10 manifest tests passed using kubectl 1.34.1/Kustomize 5.7.1.
- kubeconform 0.8.0 validated all 9 demo resources plus the opt-in seed Job
  against strict Kubernetes 1.34.0 schemas: 10 valid, 0 invalid/errors/skipped.
- No Kubernetes context was configured. Docker Desktop reported running, but
  Docker engine/status requests stalled. No cluster was created or changed;
  server dry-run, pod startup, storage permissions, and the Kubernetes end-to-end
  workflow remain unverified. Docker was not globally restarted.

The 25 October reliability update adds real worker/workflow readiness probes;
rerun image/cluster verification before deployment. The 23 October schema check
above predates those changes; subsequent structural tests are tracked in
`docs/completion-checklist.md`.

This evidence establishes valid, tested deployment configuration, not a live
Kubernetes rollout. The earlier Docker lifecycle verification remains separate.

`npm.cmd run test:kubernetes` renders base/demo/seed with kubectl and checks ten
structural/security invariants without a cluster or real secrets. Strict schema
validation is a separate check, for example with
[kubeconform](https://github.com/yannh/kubeconform):

```powershell
kubectl kustomize deploy/kubernetes/overlays/demo | kubeconform -strict -summary -kubernetes-version 1.34.0
kubectl kustomize deploy/kubernetes/jobs | kubeconform -strict -summary -kubernetes-version 1.34.0
```

Rendering, structural tests, and schema validation do **not** prove scheduling,
volume permissions, image pulls, polling, restart recovery, or successful model
calls in a cluster. Run server dry-run, rollouts, and the full frontend workflow
before claiming the Kubernetes deployment works end to end.

For public hosting, choose a managed/production Temporal setup, database backups,
TLS/auth, ingress, secret management, and observability first. The current app
does not configure Temporal Cloud TLS/auth; that integration is separate work.
Helm packaging is also not implemented by these plain Kustomize manifests.

References: [Kustomize](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/),
[StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/),
[probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/).
