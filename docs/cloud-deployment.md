# Cloud deployment: decisions and acceptance checklist

Vercel packaging is now available; follow [the Vercel runbook](vercel.md).
The budget is strictly zero. No paid infrastructure or trial is authorized.
External PostgreSQL and durable Temporal hosting remain prerequisites for a
complete Vercel deployment. The Vercel demo has a shared-password access gate;
per-user approval identity is still a separate feature.

Cloud hosting is not complete until a real environment is deployed and its
hosted incident lifecycle is verified. The repository currently supplies a
Docker image, Kubernetes manifests, and CI checks; these alone are not hosting.

## Decisions required before provisioning

- Provider and region: DigitalOcean Kubernetes follows the tutorial, but this
  has not been selected or provisioned. Other providers require their own
  current setup instructions.
- Budget and explicit approval for billable cluster nodes, persistent volumes,
  registry/storage, networking/load balancers, and optional managed services.
- Provider account access and image-registry ownership. Use local/provider
  authentication or a secret store; never put tokens in source files or chat.
- Domain and HTTPS/access-control approach. The Vercel shared-password gate
  protects access; approval attribution still trusts caller-supplied identities.
  Local Docker deployments remain open unless demo credentials are configured.
- PostgreSQL/Temporal hosting and backup plan. The current Temporal SQLite dev
  server is suitable for a private demo, not a highly available production
  cluster. Client, worker, and readiness connections now support public-CA TLS
  and API keys; endpoint provisioning and hosted verification remain outstanding.

No paid resources, registry pushes, DNS records, public endpoints, or cloud
credentials are created by the new CI workflow. CI intentionally does not
perform continuous deployment.

## Implementation sequence after those choices

1. Confirm the selected provider's current cluster and registry requirements.
2. Build and publish a versioned application image to the selected registry.
3. Create a dedicated cluster/environment with an agreed budget. Configure
   kubectl explicitly; do not assume its current context is the target.
4. Add a provider-specific overlay for the image, storage, service endpoints,
   resource sizing, registry access, and approved exposure method. Reuse the
   existing base rather than replacing application logic.
5. Configure database/provider secrets privately; do not commit generated
   Secret manifests. Review storage permissions and backup/restore procedures.
6. Run server-side validation, deploy, wait for migrations/rollouts, and seed
   reference data only when intended.
7. Put access control and HTTPS in place before publishing the console/API.
   Keep database, Temporal gRPC, and Temporal UI off the public Internet.
8. Verify `/health`, `/ready`, worker polling, and a complete fresh incident
   flow: creation, candidates, analysis, approval/rejection, outcome, audit.
9. Test pod replacement/recovery and document the hosted walkthrough, URL,
   limitations, cost controls, backups, and teardown/data-retention procedure.

The provider selection, provisioning authority, and hosted acceptance evidence
are still required. See [Kubernetes runbook](../deploy/kubernetes/README.md) and
[CI setup](ci.md) for the completed repository foundations.
